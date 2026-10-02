import "server-only";
import { createHash } from "node:crypto";
import type { ClientSession } from "mongoose";
import { z } from "zod";
import { Wedding, WeddingMembership } from "./models";
import { User } from "@/modules/auth/models";
import {
  createWeddingSchema,
  updateWeddingSchema,
  updateMemberRoleSchema,
} from "./schemas";
import { WeddingError } from "./errors";
import { generateUniqueSlug, generateGalleryToken } from "./slug";
import { connectToDatabase } from "@/server/db";

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function toWeddingDto(wedding: {
  _id: unknown;
  brideName: string;
  groomName: string;
  title?: string | null;
  description?: string | null;
  weddingDate: string;
  timeZone: string;
  location?: { formattedAddress?: string | null } | null;
  website?: { slug: string } | null;
  gallery?: {
    isEnabled: boolean;
    guestUploadsEnabled: boolean;
  } | null;
  livestream?: { youtubeUrl?: string | null; isEnabled: boolean } | null;
}) {
  return {
    id: String(wedding._id),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    description: wedding.description ?? null,
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
    location: {
      formattedAddress: wedding.location?.formattedAddress ?? undefined,
    },
    website: { slug: wedding.website?.slug ?? "" },
    gallery: {
      isEnabled: wedding.gallery?.isEnabled ?? false,
      guestUploadsEnabled: wedding.gallery?.guestUploadsEnabled ?? false,
    },
    livestream: {
      youtubeUrl: wedding.livestream?.youtubeUrl ?? null,
      isEnabled: wedding.livestream?.isEnabled ?? false,
    },
  };
}

export async function getMembershipContext(userId: string) {
  await connectToDatabase();
  const membership = await WeddingMembership.findOne({ userId }).lean();
  if (!membership) return { membership: null, wedding: null };
  const wedding = await Wedding.findOne({
    _id: membership.weddingId,
    deletedAt: null,
  }).lean();
  if (!wedding) return { membership: null, wedding: null };
  return { membership, wedding };
}

export async function createWedding(
  userId: string,
  input: z.infer<typeof createWeddingSchema>,
) {
  await connectToDatabase();
  if (await WeddingMembership.exists({ userId }))
    throw new WeddingError(
      "ALREADY_HAS_WEDDING",
      "You already belong to a wedding.",
      409,
    );
  const slug = await generateUniqueSlug(
    input.brideName,
    input.groomName,
    input.weddingDate,
  );
  const gallery = {
    tokenHash: hashToken(generateGalleryToken()),
    isEnabled: true,
    guestUploadsEnabled: true,
  };
  const weddingFields = {
    brideName: input.brideName,
    groomName: input.groomName,
    title: input.title,
    description: input.description,
    weddingDate: input.weddingDate,
    timeZone: input.timeZone,
    location: input.location ?? {},
    website: { slug, theme: "CLASSIC", isPublished: false },
    gallery,
    livestream: { isEnabled: false },
    createdByUserId: userId,
  };
  const session = await Wedding.db.startSession();
  try {
    let wedding;
    await session.withTransaction(async () => {
      const [created] = await Wedding.create([weddingFields], { session });
      wedding = created;
      await WeddingMembership.create(
        [
          {
            userId,
            weddingId: created._id,
            role: "ADMIN",
            joinedAt: new Date(),
          },
        ],
        { session },
      );
    });
    if (!wedding) throw new Error("Wedding was not created.");
    return toWeddingDto(wedding);
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new WeddingError(
        "ALREADY_HAS_WEDDING",
        "You already belong to a wedding.",
        409,
      );
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function updateWedding(
  weddingId: string,
  input: z.infer<typeof updateWeddingSchema>,
) {
  await connectToDatabase();
  const update: Record<string, unknown> = {};
  for (const key of [
    "brideName",
    "groomName",
    "title",
    "description",
    "weddingDate",
    "timeZone",
  ] as const) {
    if (input[key] !== undefined) update[key] = input[key];
  }
  if (input.location) {
    for (const [key, value] of Object.entries(input.location)) {
      if (value !== undefined) update[`location.${key}`] = value;
    }
    if (input.location.formattedAddress === "")
      update["location.formattedAddress"] = null;
  }
  if (Object.keys(update).length === 0)
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Provide at least one field to update.",
      400,
    );
  if (
    input.brideName !== undefined ||
    input.groomName !== undefined ||
    input.weddingDate !== undefined
  ) {
    const current = await Wedding.findOne({
      _id: weddingId,
      deletedAt: null,
    }).lean();
    if (!current)
      throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
    update["website.slug"] = await generateUniqueSlug(
      input.brideName ?? current.brideName,
      input.groomName ?? current.groomName,
      input.weddingDate ?? current.weddingDate,
      weddingId,
    );
  }
  const wedding = await Wedding.findOneAndUpdate(
    { _id: weddingId, deletedAt: null },
    { $set: update },
    { returnDocument: "after" },
  ).lean();
  if (!wedding) throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
  return toWeddingDto(wedding);
}

export async function listMembers(weddingId: string) {
  await connectToDatabase();
  const memberships = await WeddingMembership.find({ weddingId })
    .sort({ joinedAt: 1 })
    .lean();
  const users = await User.find({
    _id: { $in: memberships.map((m) => m.userId) },
  }).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return memberships.map((m) => {
    const user = byId.get(String(m.userId));
    return {
      membershipId: String(m._id),
      user: user
        ? { id: String(user._id), name: user.name, email: user.email }
        : null,
      role: m.role,
      joinedAt: m.joinedAt,
    };
  });
}

async function guardLastAdmin(
  weddingId: string,
  membershipId: string,
  session: ClientSession,
  nextRole?: "ADMIN" | "MANAGER",
) {
  await Wedding.updateOne(
    { _id: weddingId },
    { $currentDate: { updatedAt: true } },
  ).session(session);
  const membership = await WeddingMembership.findOne({
    _id: membershipId,
    weddingId,
  }).session(session);
  if (!membership)
    throw new WeddingError("NOT_FOUND", "Member not found.", 404);
  const removesAdmin =
    membership.role === "ADMIN" &&
    (nextRole === undefined || nextRole !== "ADMIN");
  if (removesAdmin) {
    const adminCount = await WeddingMembership.countDocuments({
      weddingId,
      role: "ADMIN",
    }).session(session);
    if (adminCount <= 1)
      throw new WeddingError(
        "LAST_ADMIN",
        "The last Admin cannot be changed or removed.",
        409,
      );
  }
  return membership;
}

export async function updateMemberRole(
  weddingId: string,
  membershipId: string,
  input: z.infer<typeof updateMemberRoleSchema>,
) {
  await connectToDatabase();
  const session = await WeddingMembership.db.startSession();
  try {
    let role = input.role;
    await session.withTransaction(async () => {
      const membership = await guardLastAdmin(
        weddingId,
        membershipId,
        session,
        input.role,
      );
      membership.role = input.role;
      await membership.save({ session });
      role = membership.role;
    });
    return { membershipId, role };
  } finally {
    await session.endSession();
  }
}

export async function removeMember(weddingId: string, membershipId: string) {
  await connectToDatabase();
  const session = await WeddingMembership.db.startSession();
  try {
    await session.withTransaction(async () => {
      await guardLastAdmin(weddingId, membershipId, session);
      await WeddingMembership.deleteOne({
        _id: membershipId,
        weddingId,
      }).session(session);
    });
  } finally {
    await session.endSession();
  }
}
