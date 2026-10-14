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
  updateWebsiteSchema,
  updateLivestreamSchema,
  youtubeVideoId,
} from "./schemas";
import { Event } from "@/modules/events/models";
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
  const wedding = await Wedding.findOneAndUpdate(
    { _id: weddingId, deletedAt: null },
    { $set: update },
    { returnDocument: "after", runValidators: true },
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

export async function getWeddingWebsite(weddingId: string) {
  await connectToDatabase();
  const wedding = await Wedding.findOne({
    _id: weddingId,
    deletedAt: null,
  }).lean();
  if (!wedding) throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
  return toWebsiteDto(wedding);
}

export async function updateWeddingWebsite(
  weddingId: string,
  input: z.infer<typeof updateWebsiteSchema>,
) {
  await connectToDatabase();
  const update: Record<string, unknown> = {};
  if (input.theme !== undefined) update["website.theme"] = input.theme;
  if (input.welcomeMessage !== undefined)
    update["website.welcomeMessage"] = input.welcomeMessage;
  if (input.isPublished !== undefined)
    update["website.isPublished"] = input.isPublished;

  const wedding = await Wedding.findOneAndUpdate(
    { _id: weddingId, deletedAt: null },
    { $set: update },
    { returnDocument: "after" },
  ).lean();
  if (!wedding) throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
  return toWebsiteDto(wedding);
}

function toWebsiteDto(wedding: {
  website?: {
    slug?: string | null;
    theme?: string | null;
    isPublished?: boolean | null;
    welcomeMessage?: string | null;
  } | null;
}) {
  return {
    slug: wedding.website?.slug ?? "",
    theme: wedding.website?.theme ?? "CLASSIC",
    isPublished: wedding.website?.isPublished ?? false,
    welcomeMessage: wedding.website?.welcomeMessage ?? null,
  };
}

function toLivestreamDto(wedding: {
  livestream?: {
    youtubeUrl?: string | null;
    isEnabled?: boolean | null;
  } | null;
}) {
  const youtubeUrl = wedding.livestream?.youtubeUrl ?? null;
  return {
    youtubeUrl,
    videoId: youtubeUrl ? youtubeVideoId(youtubeUrl) : null,
    isEnabled: wedding.livestream?.isEnabled ?? false,
  };
}

export async function getWeddingLivestream(weddingId: string) {
  await connectToDatabase();
  const wedding = await Wedding.findOne({
    _id: weddingId,
    deletedAt: null,
  }).lean();
  if (!wedding) throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
  return toLivestreamDto(wedding);
}

export async function updateWeddingLivestream(
  weddingId: string,
  input: z.infer<typeof updateLivestreamSchema>,
) {
  await connectToDatabase();
  const current = await Wedding.findOne({
    _id: weddingId,
    deletedAt: null,
  }).lean();
  if (!current) throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);

  const nextUrl =
    input.youtubeUrl !== undefined
      ? input.youtubeUrl
      : (current.livestream?.youtubeUrl ?? null);
  const nextEnabled =
    input.isEnabled !== undefined
      ? input.isEnabled
      : (current.livestream?.isEnabled ?? false);
  if (nextEnabled && !nextUrl) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Add a YouTube link before turning the livestream on.",
      400,
    );
  }

  const update: Record<string, unknown> = {};
  if (input.youtubeUrl !== undefined)
    update["livestream.youtubeUrl"] = input.youtubeUrl;
  if (input.isEnabled !== undefined)
    update["livestream.isEnabled"] = input.isEnabled;
  const wedding = await Wedding.findOneAndUpdate(
    { _id: weddingId, deletedAt: null },
    { $set: update },
    { returnDocument: "after" },
  ).lean();
  if (!wedding) throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
  return toLivestreamDto(wedding);
}

export async function getPublicWedding(
  slug: string,
  options?: { allowDraftForWeddingId?: string },
) {
  await connectToDatabase();
  const wedding = await Wedding.findOne({
    "website.slug": slug,
    deletedAt: null,
  }).lean();
  const isMemberDraft =
    Boolean(options?.allowDraftForWeddingId) &&
    String(wedding?._id) === options?.allowDraftForWeddingId;
  if (!wedding || (!wedding.website?.isPublished && !isMemberDraft)) {
    throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
  }
  const stream = toLivestreamDto(wedding);
  const publicStream =
    stream.isEnabled && stream.videoId
      ? {
          enabled: true,
          youtubeUrl: stream.youtubeUrl,
          videoId: stream.videoId,
        }
      : { enabled: false, youtubeUrl: null, videoId: null };
  const events = await Event.find({
    weddingId: wedding._id,
    archivedAt: null,
  })
    .sort({ startsAt: 1 })
    .lean();

  return {
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    description: wedding.description ?? null,
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
    location: {
      formattedAddress: wedding.location?.formattedAddress ?? null,
      city: wedding.location?.city ?? null,
      state: wedding.location?.state ?? null,
      country: wedding.location?.country ?? null,
    },
    coverImageUrl: null,
    theme: wedding.website?.theme ?? "CLASSIC",
    welcomeMessage: wedding.website?.welcomeMessage ?? null,
    isPublished: wedding.website?.isPublished ?? false,
    events: events.map((event) => ({
      id: String(event._id),
      name: event.name,
      type: event.type ?? null,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      venueName: event.venueName ?? null,
      address: event.address ?? null,
      description: event.description ?? null,
      dressCode: event.dressCode ?? null,
    })),
    gallery: {
      enabled: wedding.gallery?.isEnabled ?? false,
    },
    livestream: publicStream,
  };
}
