import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { User } from "@/modules/auth/models";
import { connectToDatabase } from "@/server/db";
import {
  InvitationEmailError,
  sendMemberInvitationEmail,
} from "@/server/email/member-invitation";
import { WeddingError } from "./errors";
import { Wedding, WeddingMemberInvitation, WeddingMembership } from "./models";

const INVITATION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

function invitationSecret() {
  const value = process.env.MEMBER_INVITATION_SECRET;
  if (!value || value.length < 32)
    throw new WeddingError(
      "INVITATION_NOT_CONFIGURED",
      "We couldn't send the invitation. Please try again.",
      503,
    );
  return value;
}

export function hashInvitationToken(token: string) {
  return createHmac("sha256", invitationSecret()).update(token).digest("hex");
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function toInvitationDto(invitation: {
  _id: unknown;
  email: string;
  role: "ADMIN" | "MANAGER";
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  expiresAt: Date;
}) {
  return {
    id: String(invitation._id),
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  };
}

export async function listPendingInvitations(weddingId: string) {
  await connectToDatabase();
  const invitations = await WeddingMemberInvitation.find({
    weddingId,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
  return invitations.map(toInvitationDto);
}

export async function createMemberInvitation(
  context: {
    weddingId: string;
    invitedByUserId: string;
    inviterName: string;
    brideName: string;
    groomName: string;
    weddingDate: string;
  },
  input: { email: string; role: "ADMIN" | "MANAGER" },
  origin: string,
  deliver = sendMemberInvitationEmail,
) {
  await connectToDatabase();
  const emailNormalized = normalizeEmail(input.email);
  const existingUser = await User.findOne({ emailNormalized }).lean();
  if (existingUser) {
    const membership = await WeddingMembership.findOne({
      userId: existingUser._id,
    }).lean();
    if (membership)
      throw membership.weddingId.toString() === context.weddingId
        ? new WeddingError(
            "ALREADY_MEMBER",
            "This person is already a member of your wedding.",
            409,
          )
        : new WeddingError(
            "ALREADY_HAS_WEDDING",
            "This person already belongs to another wedding.",
            409,
          );
  }
  const existing = await WeddingMemberInvitation.findOne({
    weddingId: context.weddingId,
    emailNormalized,
    status: "PENDING",
  });
  if (existing && existing.expiresAt > new Date())
    throw new WeddingError(
      "INVITATION_PENDING",
      "An invitation to this email is already waiting.",
      409,
    );
  if (existing) await existing.deleteOne();

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);
  let invitation;
  try {
    invitation = await WeddingMemberInvitation.create({
      weddingId: context.weddingId,
      email: input.email.trim(),
      emailNormalized,
      role: input.role,
      tokenHash: hashInvitationToken(token),
      status: "PENDING",
      invitedByUserId: context.invitedByUserId,
      expiresAt,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new WeddingError(
        "INVITATION_PENDING",
        "An invitation to this email is already waiting.",
        409,
      );
    throw error;
  }
  try {
    await deliver({
      to: invitation.email,
      inviterName: context.inviterName,
      coupleName: `${context.brideName} & ${context.groomName}`,
      weddingDate: context.weddingDate,
      role: invitation.role,
      acceptUrl: `${origin}/member-invitations/${token}`,
      accountExists: Boolean(existingUser),
      expiresAt,
    });
  } catch (error) {
    await WeddingMemberInvitation.deleteOne({ _id: invitation._id });
    const reason = error instanceof InvitationEmailError ? error.reason : null;
    throw new WeddingError(
      "EMAIL_DELIVERY_FAILED",
      reason === "DOMAIN_NOT_VERIFIED"
        ? "The wedding email sender is not verified yet. Ask the site owner to finish email setup, then try again."
        : reason === "TEST_MODE"
          ? "Wedding email is still in test mode, so this invitation was not delivered."
          : "We couldn't send the invitation. Please try again.",
      502,
    );
  }
  return toInvitationDto(invitation);
}

export async function revokeMemberInvitation(
  weddingId: string,
  invitationId: string,
) {
  await connectToDatabase();
  const invitation = await WeddingMemberInvitation.findOneAndUpdate(
    { _id: invitationId, weddingId, status: "PENDING" },
    { $set: { status: "REVOKED" } },
    { returnDocument: "after" },
  ).lean();
  if (invitation) return toInvitationDto(invitation);
  const existing = await WeddingMemberInvitation.findOne({
    _id: invitationId,
    weddingId,
  }).lean();
  if (!existing)
    throw new WeddingError("NOT_FOUND", "Invitation not found.", 404);
  if (existing.status === "REVOKED") return toInvitationDto(existing);
  throw new WeddingError(
    "INVITATION_ALREADY_ACCEPTED",
    "This invitation has already been accepted.",
    409,
  );
}

export async function getPublicMemberInvitation(token: string) {
  await connectToDatabase();
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new WeddingError("INVALID_TOKEN", "This invitation is invalid.", 404);
  const invitation = await WeddingMemberInvitation.findOne({
    tokenHash: hashInvitationToken(token),
  }).lean();
  if (!invitation || invitation.status === "REVOKED")
    throw new WeddingError(
      "INVITATION_REVOKED",
      "This invitation is no longer available.",
      410,
    );
  const wedding = await Wedding.findOne({
    _id: invitation.weddingId,
    deletedAt: null,
  }).lean();
  if (!wedding)
    throw new WeddingError("INVALID_TOKEN", "This invitation is invalid.", 404);
  const state =
    invitation.status === "ACCEPTED"
      ? "ACCEPTED"
      : invitation.expiresAt <= new Date()
        ? "EXPIRED"
        : "PENDING";
  const accountExists = Boolean(
    await User.exists({ emailNormalized: invitation.emailNormalized }),
  );
  return {
    state,
    email: invitation.email,
    role: invitation.role,
    accountExists,
    wedding: {
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate,
    },
  };
}

export async function acceptMemberInvitation(token: string, userId: string) {
  await connectToDatabase();
  const tokenHash = hashInvitationToken(token);
  const session = await WeddingMemberInvitation.db.startSession();
  try {
    let result: { weddingId: string; role: "ADMIN" | "MANAGER" } | undefined;
    await session.withTransaction(async () => {
      const invitation = await WeddingMemberInvitation.findOne({
        tokenHash,
      }).session(session);
      if (!invitation || invitation.status === "REVOKED")
        throw new WeddingError(
          "INVALID_TOKEN",
          "This invitation is no longer available.",
          404,
        );
      if (invitation.status === "ACCEPTED")
        throw new WeddingError(
          "INVITATION_ALREADY_ACCEPTED",
          "This invitation has already been accepted.",
          409,
        );
      if (invitation.expiresAt <= new Date())
        throw new WeddingError(
          "TOKEN_EXPIRED",
          "This invitation has expired.",
          410,
        );
      const user = await User.findById(userId).session(session);
      if (!user)
        throw new WeddingError("UNAUTHENTICATED", "Please sign in.", 401);
      if (normalizeEmail(user.email) !== invitation.emailNormalized)
        throw new WeddingError(
          "INVITATION_EMAIL_MISMATCH",
          "This invitation was sent to a different email address.",
          403,
        );
      if (await WeddingMembership.exists({ userId }).session(session))
        throw new WeddingError(
          "ALREADY_HAS_WEDDING",
          "Your account already belongs to a wedding.",
          409,
        );
      await WeddingMembership.create(
        [
          {
            userId,
            weddingId: invitation.weddingId,
            role: invitation.role,
            joinedAt: new Date(),
          },
        ],
        { session },
      );
      invitation.status = "ACCEPTED";
      invitation.acceptedByUserId = new Types.ObjectId(userId);
      invitation.acceptedAt = new Date();
      await invitation.save({ session });
      result = {
        weddingId: String(invitation.weddingId),
        role: invitation.role,
      };
    });
    if (!result) throw new Error("Invitation was not accepted.");
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new WeddingError(
        "ALREADY_HAS_WEDDING",
        "Your account already belongs to a wedding.",
        409,
      );
    throw error;
  } finally {
    await session.endSession();
  }
}
