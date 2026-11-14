import "server-only";
import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import { Guest } from "./models";
import { Event } from "@/modules/events/models";
import { Wedding } from "@/modules/wedding/models";
import { WeddingError } from "@/modules/wedding/errors";
import { connectToDatabase } from "@/server/db";
import type {
  CreateGuestInput,
  UpdateGuestInput,
  ListGuestsQuery,
  PublicRsvpInput,
} from "./schemas";
import {
  sendGuestInvitationEmail,
  sendGuestReminderEmail,
  GuestEmailError,
} from "@/server/email/guest-notification";
import { consumeLimit } from "@/server/auth/rate-limit";

export interface GuestDto {
  id: string;
  weddingId: string;
  name: string;
  email: string | null;
  phone: string | null;
  maxGuests: number;
  isFamily: boolean;
  invitedEventIds: string[];
  invitedEvents: Array<{
    id: string;
    name: string;
    startsAt: string | null;
    venueName: string | null;
  }>;
  notes: string | null;
  invitationSentAt: string | null;
  lastReminderSentAt: string | null;
  reminderCount: number;
  rsvpStatus: "PENDING" | "ATTENDING" | "NOT_ATTENDING";
  attendingCount: number | null;
  rsvpUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicInvitationDto {
  guest: {
    name: string;
    maxGuests: number;
    isFamily: boolean;
    rsvpStatus: "PENDING" | "ATTENDING" | "NOT_ATTENDING";
    attendingCount: number | null;
  };
  wedding: {
    title: string;
    brideName: string;
    groomName: string;
    weddingDate: string | null;
    timeZone: string;
    location: string;
  };
  events: Array<{
    id: string;
    name: string;
    type?: string | null;
    startsAt: string | null;
    endsAt: string | null;
    venueName: string | null;
    address: string | null;
    dressCode: string | null;
    description: string | null;
  }>;
}

async function validateEventIds(
  weddingId: string,
  eventIds: string[],
  alreadyLinked: string[] = [],
): Promise<void> {
  if (eventIds.length === 0) return;
  // A phone or name edit resubmits the guest's existing links. An archived or
  // deleted celebration already on the record must not block that save. A newly
  // selected celebration still has to be an active event of this wedding.
  const kept = new Set(alreadyLinked);
  const added = eventIds.filter((id) => !kept.has(id));
  if (added.length === 0) return;
  const count = await Event.countDocuments({
    weddingId: new mongoose.Types.ObjectId(weddingId),
    _id: { $in: added.map((id) => new mongoose.Types.ObjectId(id)) },
    archivedAt: null,
  });
  if (count !== added.length) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "One or more selected celebrations do not belong to this wedding.",
      400,
    );
  }
}

export async function createGuest(
  weddingId: string,
  input: CreateGuestInput,
): Promise<GuestDto> {
  await connectToDatabase();

  const eventIds = input.invitedEventIds || [];
  await validateEventIds(weddingId, eventIds);

  const guest = await Guest.create({
    weddingId: new mongoose.Types.ObjectId(weddingId),
    name: input.name,
    email: input.email || null,
    emailNormalized: input.email ? input.email.toLowerCase().trim() : null,
    phone: input.phone || null,
    maxGuests: input.maxGuests,
    isFamily: Boolean(input.isFamily),
    invitedEventIds: eventIds.map((id) => new mongoose.Types.ObjectId(id)),
    notes: input.notes || null,
    rsvpStatus: "PENDING",
    attendingCount: null,
  });

  return getGuest(weddingId, String(guest._id));
}

export async function listGuests(
  weddingId: string,
  query: ListGuestsQuery,
): Promise<{
  data: GuestDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  await connectToDatabase();

  const filter: Record<string, unknown> = {
    weddingId: new mongoose.Types.ObjectId(weddingId),
  };

  if (query.rsvpStatus && query.rsvpStatus !== "ALL") {
    filter.rsvpStatus = query.rsvpStatus;
  }

  if (query.invitationStatus === "SENT") {
    filter.invitationSentAt = { $ne: null };
  } else if (query.invitationStatus === "UNSENT") {
    filter.invitationSentAt = null;
  }

  if (query.eventId) {
    filter.invitedEventIds = new mongoose.Types.ObjectId(query.eventId);
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { name: regex },
      { emailNormalized: regex },
      { phone: regex },
    ];
  }

  const [total, guests, events] = await Promise.all([
    Guest.countDocuments(filter),
    Guest.find(filter)
      .sort({ name: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Event.find({
      weddingId: new mongoose.Types.ObjectId(weddingId),
      archivedAt: null,
    })
      .select("_id name startsAt venueName")
      .lean(),
  ]);

  const eventMap = new Map<
    string,
    {
      id: string;
      name: string;
      startsAt: string | null;
      venueName: string | null;
    }
  >();
  for (const e of events) {
    eventMap.set(String(e._id), {
      id: String(e._id),
      name: e.name,
      startsAt: e.startsAt ? new Date(e.startsAt).toISOString() : null,
      venueName: e.venueName ?? null,
    });
  }

  const data: GuestDto[] = guests.map((g) => {
    const invitedIds = (g.invitedEventIds || []).map((id) => String(id));
    return {
      id: String(g._id),
      weddingId: String(g.weddingId),
      name: g.name,
      email: g.email ?? null,
      phone: g.phone ?? null,
      maxGuests: g.maxGuests,
      isFamily: Boolean(g.isFamily),
      invitedEventIds: invitedIds,
      invitedEvents: invitedIds
        .map((id) => eventMap.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      notes: g.notes ?? null,
      invitationSentAt: g.invitationSentAt
        ? new Date(g.invitationSentAt).toISOString()
        : null,
      lastReminderSentAt: g.lastReminderSentAt
        ? new Date(g.lastReminderSentAt).toISOString()
        : null,
      reminderCount: g.reminderCount ?? 0,
      rsvpStatus: g.rsvpStatus as "PENDING" | "ATTENDING" | "NOT_ATTENDING",
      attendingCount: g.attendingCount ?? null,
      rsvpUpdatedAt: g.rsvpUpdatedAt
        ? new Date(g.rsvpUpdatedAt).toISOString()
        : null,
      createdAt: new Date(g.createdAt).toISOString(),
      updatedAt: new Date(g.updatedAt).toISOString(),
    };
  });

  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getGuest(
  weddingId: string,
  guestId: string,
): Promise<GuestDto> {
  await connectToDatabase();

  const guest = await Guest.findOne({
    _id: new mongoose.Types.ObjectId(guestId),
    weddingId: new mongoose.Types.ObjectId(weddingId),
  }).lean();

  if (!guest) {
    throw new WeddingError("NOT_FOUND", "Guest record not found.", 404);
  }

  const invitedIds = (guest.invitedEventIds || []).map((id) => String(id));
  const events = await Event.find({
    weddingId: new mongoose.Types.ObjectId(weddingId),
    _id: { $in: guest.invitedEventIds || [] },
    // Archived celebrations are not shown as active invitations here, matching
    // the guest list and the public invitation page.
    archivedAt: null,
  }).lean();

  return {
    id: String(guest._id),
    weddingId: String(guest.weddingId),
    name: guest.name,
    email: guest.email ?? null,
    phone: guest.phone ?? null,
    maxGuests: guest.maxGuests,
    isFamily: Boolean(guest.isFamily),
    invitedEventIds: invitedIds,
    invitedEvents: events.map((e) => ({
      id: String(e._id),
      name: e.name,
      startsAt: e.startsAt ? new Date(e.startsAt).toISOString() : null,
      venueName: e.venueName ?? null,
    })),
    notes: guest.notes ?? null,
    invitationSentAt: guest.invitationSentAt
      ? new Date(guest.invitationSentAt).toISOString()
      : null,
    lastReminderSentAt: guest.lastReminderSentAt
      ? new Date(guest.lastReminderSentAt).toISOString()
      : null,
    reminderCount: guest.reminderCount ?? 0,
    rsvpStatus: guest.rsvpStatus as "PENDING" | "ATTENDING" | "NOT_ATTENDING",
    attendingCount: guest.attendingCount ?? null,
    rsvpUpdatedAt: guest.rsvpUpdatedAt
      ? new Date(guest.rsvpUpdatedAt).toISOString()
      : null,
    createdAt: new Date(guest.createdAt).toISOString(),
    updatedAt: new Date(guest.updatedAt).toISOString(),
  };
}

export async function getGuestInvitationLink(
  weddingId: string,
  guestId: string,
  origin?: string,
): Promise<{ url: string; token: string }> {
  await connectToDatabase();

  const guest = await Guest.findOne({
    _id: new mongoose.Types.ObjectId(guestId),
    weddingId: new mongoose.Types.ObjectId(weddingId),
  })
    .select("+invitationToken")
    .lean();

  if (!guest) {
    throw new WeddingError("NOT_FOUND", "Guest record not found.", 404);
  }

  // The stable link uses the configured origin, never the request Host header,
  // so a spoofed Host cannot mint a phishing link for a member to copy.
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_ORIGIN || origin || "";
  const cleanBase = baseUrl.replace(/\/$/, "");
  const url = cleanBase
    ? `${cleanBase}/invite/${guest.invitationToken}`
    : `/invite/${guest.invitationToken}`;

  return { url, token: guest.invitationToken };
}

export async function updateGuest(
  weddingId: string,
  guestId: string,
  input: UpdateGuestInput,
): Promise<GuestDto> {
  await connectToDatabase();

  const existing = await Guest.findOne({
    _id: new mongoose.Types.ObjectId(guestId),
    weddingId: new mongoose.Types.ObjectId(weddingId),
  }).lean();

  if (!existing) {
    throw new WeddingError("NOT_FOUND", "Guest record not found.", 404);
  }

  const update: Record<string, unknown> = {};

  if (input.maxGuests !== undefined) {
    const attending = existing.attendingCount ?? 0;
    if (existing.rsvpStatus === "ATTENDING" && input.maxGuests < attending) {
      throw new WeddingError(
        "VALIDATION_ERROR",
        `Cannot reduce maximum party size below the current attending count (${attending}).`,
        400,
      );
    }
    update.maxGuests = input.maxGuests;
  }

  if (input.invitedEventIds !== undefined) {
    await validateEventIds(
      weddingId,
      input.invitedEventIds,
      (existing.invitedEventIds || []).map((id) => String(id)),
    );
    update.invitedEventIds = input.invitedEventIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );
  }

  if (input.name !== undefined) update.name = input.name;
  if (input.email !== undefined) {
    update.email = input.email || null;
    update.emailNormalized = input.email
      ? input.email.toLowerCase().trim()
      : null;
  }
  if (input.phone !== undefined) update.phone = input.phone || null;
  if (input.isFamily !== undefined) update.isFamily = input.isFamily;
  if (input.notes !== undefined) update.notes = input.notes || null;

  // Compare-and-set on updatedAt so a concurrent edit returns CONFLICT instead
  // of silently overwriting another member's change.
  const updated = await Guest.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(guestId),
      weddingId: new mongoose.Types.ObjectId(weddingId),
      updatedAt: existing.updatedAt,
    },
    { $set: update },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    throw new WeddingError(
      "CONFLICT",
      "This guest changed elsewhere. Reload and try again.",
      409,
    );
  }

  return getGuest(weddingId, guestId);
}

export async function deleteGuest(
  weddingId: string,
  guestId: string,
): Promise<{ success: boolean }> {
  await connectToDatabase();

  const result = await Guest.deleteOne({
    _id: new mongoose.Types.ObjectId(guestId),
    weddingId: new mongoose.Types.ObjectId(weddingId),
  });

  if (result.deletedCount === 0) {
    throw new WeddingError("NOT_FOUND", "Guest record not found.", 404);
  }

  return { success: true };
}

export async function getRsvpSummary(weddingId: string): Promise<{
  totalGuests: number;
  pendingInvitations: number;
  attendingInvitations: number;
  notAttendingInvitations: number;
  totalPeopleAttending: number;
  totalCapacity: number;
  sentInvitations: number;
  unsentInvitations: number;
}> {
  await connectToDatabase();

  const id = new mongoose.Types.ObjectId(weddingId);
  const guests = await Guest.find({ weddingId: id })
    .select("rsvpStatus attendingCount maxGuests invitationSentAt")
    .lean();

  let pendingInvitations = 0;
  let attendingInvitations = 0;
  let notAttendingInvitations = 0;
  let totalPeopleAttending = 0;
  let totalCapacity = 0;
  let sentInvitations = 0;
  let unsentInvitations = 0;

  for (const g of guests) {
    totalCapacity += g.maxGuests || 1;
    if (g.invitationSentAt) {
      sentInvitations++;
    } else {
      unsentInvitations++;
    }

    if (g.rsvpStatus === "ATTENDING") {
      attendingInvitations++;
      totalPeopleAttending += g.attendingCount ?? 0;
    } else if (g.rsvpStatus === "NOT_ATTENDING") {
      notAttendingInvitations++;
    } else {
      pendingInvitations++;
    }
  }

  return {
    totalGuests: guests.length,
    pendingInvitations,
    attendingInvitations,
    notAttendingInvitations,
    totalPeopleAttending,
    totalCapacity,
    sentInvitations,
    unsentInvitations,
  };
}

export async function recordInvitationSent(
  weddingId: string,
  guestId: string,
  options?: { sendEmail?: boolean; origin?: string },
): Promise<GuestDto> {
  await connectToDatabase();

  const existing = await Guest.findOne({
    _id: new mongoose.Types.ObjectId(guestId),
    weddingId: new mongoose.Types.ObjectId(weddingId),
  })
    .select("+invitationToken")
    .lean();

  if (!existing) {
    throw new WeddingError("NOT_FOUND", "Guest record not found.", 404);
  }

  if (options?.sendEmail) {
    if (!existing.email) {
      throw new WeddingError(
        "VALIDATION_ERROR",
        "Guest does not have an email address to send an invitation.",
        400,
      );
    }

    const wedding = await Wedding.findById(
      new mongoose.Types.ObjectId(weddingId),
    ).lean();
    if (!wedding) {
      throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
    }

    const events = existing.invitedEventIds?.length
      ? await Event.find({
          _id: { $in: existing.invitedEventIds },
          weddingId: new mongoose.Types.ObjectId(weddingId),
        }).lean()
      : [];

    const baseUrl =
      options.origin ||
      process.env.APP_ORIGIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";
    const cleanBase = baseUrl.replace(/\/$/, "");
    const inviteUrl = cleanBase
      ? `${cleanBase}/invite/${existing.invitationToken}`
      : `/invite/${existing.invitationToken}`;

    const coupleName =
      wedding.title || `${wedding.brideName} & ${wedding.groomName}`;

    try {
      await sendGuestInvitationEmail({
        to: existing.email,
        guestName: existing.name,
        coupleName,
        weddingDate: wedding.weddingDate,
        venue:
          wedding.location?.formattedAddress ||
          wedding.location?.city ||
          "Royal Celebration Venue",
        events: events.map((e) => ({
          name: e.name,
          startsAt: e.startsAt ? new Date(e.startsAt).toISOString() : null,
          venueName: e.venueName ?? null,
        })),
        inviteUrl,
        isFamily: existing.isFamily,
        maxGuests: existing.maxGuests,
      });
    } catch (err) {
      const reason = err instanceof GuestEmailError ? err.reason : null;
      throw new WeddingError(
        "EMAIL_DELIVERY_FAILED",
        reason === "DOMAIN_NOT_VERIFIED"
          ? "The wedding email sender is not verified yet. Ask the site owner to finish email setup, then try again."
          : reason === "TEST_MODE"
            ? "Wedding email is still in test mode, so this invitation was not delivered."
            : reason === "CONFIG_MISSING"
              ? "Wedding email is not set up yet."
              : "The invitation email could not be delivered. Please try again.",
        502,
      );
    }
  }

  await Guest.updateOne(
    { _id: existing._id },
    { $set: { invitationSentAt: new Date() } },
  );

  return getGuest(weddingId, guestId);
}

export async function recordInvitationReminder(
  weddingId: string,
  guestId: string,
  options?: {
    sendEmail?: boolean;
    origin?: string;
    subject?: string;
    templateType?: "gentle" | "final";
  },
): Promise<GuestDto> {
  await connectToDatabase();

  const existing = await Guest.findOne({
    _id: new mongoose.Types.ObjectId(guestId),
    weddingId: new mongoose.Types.ObjectId(weddingId),
  })
    .select("+invitationToken")
    .lean();

  if (!existing) {
    throw new WeddingError("NOT_FOUND", "Guest record not found.", 404);
  }

  if (options?.sendEmail) {
    if (!existing.email) {
      throw new WeddingError(
        "VALIDATION_ERROR",
        "Guest does not have an email address to send a reminder.",
        400,
      );
    }
    if (remindedRecently(existing.lastReminderSentAt)) {
      throw new WeddingError(
        "CONFLICT",
        "A reminder was already sent to this guest in the last 24 hours.",
        409,
      );
    }

    const wedding = await Wedding.findById(
      new mongoose.Types.ObjectId(weddingId),
    ).lean();
    if (!wedding) {
      throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
    }

    const baseUrl =
      options.origin ||
      process.env.APP_ORIGIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";
    const cleanBase = baseUrl.replace(/\/$/, "");
    const inviteUrl = cleanBase
      ? `${cleanBase}/invite/${existing.invitationToken}`
      : `/invite/${existing.invitationToken}`;

    const coupleName =
      wedding.title || `${wedding.brideName} & ${wedding.groomName}`;

    try {
      await sendGuestReminderEmail({
        to: existing.email,
        guestName: existing.name,
        coupleName,
        weddingDate: wedding.weddingDate,
        venue:
          wedding.location?.formattedAddress ||
          wedding.location?.city ||
          "Royal Celebration Venue",
        inviteUrl,
        isFamily: existing.isFamily,
        maxGuests: existing.maxGuests,
        subject: options?.subject,
        tone: options?.templateType,
      });
    } catch (err) {
      const reason = err instanceof GuestEmailError ? err.reason : null;
      throw new WeddingError(
        "EMAIL_DELIVERY_FAILED",
        reason === "DOMAIN_NOT_VERIFIED"
          ? "The wedding email sender is not verified yet. Ask the site owner to finish email setup, then try again."
          : reason === "TEST_MODE"
            ? "Wedding email is still in test mode, so this reminder was not delivered."
            : reason === "CONFIG_MISSING"
              ? "Wedding email is not set up yet."
              : "The reminder email could not be delivered. Please try again.",
        502,
      );
    }
  }

  // Opening a WhatsApp chat is not a sent reminder. Counting it here used to
  // start the 24-hour email cooldown even though no email went out.
  if (options?.sendEmail) {
    await Guest.updateOne(
      { _id: existing._id },
      {
        $set: { lastReminderSentAt: new Date() },
        $inc: { reminderCount: 1 },
      },
    );
  }

  return getGuest(weddingId, guestId);
}

export async function batchSendReminders(
  weddingId: string,
  options?: {
    sendEmail?: boolean;
    origin?: string;
    subject?: string;
    templateType?: "gentle" | "final";
  },
): Promise<{
  sentCount: number;
  emailsSent: number;
  emailsFailed: number;
  skippedNoEmail: number;
  skippedRecent: number;
  emailError: string | null;
}> {
  await connectToDatabase();

  const pending = await Guest.find({
    weddingId: new mongoose.Types.ObjectId(weddingId),
    rsvpStatus: "PENDING",
  })
    .select("+invitationToken")
    .lean();

  if (pending.length === 0) {
    return {
      sentCount: 0,
      emailsSent: 0,
      emailsFailed: 0,
      skippedNoEmail: 0,
      skippedRecent: 0,
      emailError: null,
    };
  }

  let emailsSent = 0;
  let emailsFailed = 0;
  let skippedNoEmail = 0;
  let skippedRecent = 0;
  let emailError: string | null = null;
  const remindedIds: mongoose.Types.ObjectId[] = [];

  if (options?.sendEmail) {
    const wedding = await Wedding.findById(
      new mongoose.Types.ObjectId(weddingId),
    ).lean();
    const baseUrl =
      options.origin ||
      process.env.APP_ORIGIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";
    const cleanBase = baseUrl.replace(/\/$/, "");
    const coupleName =
      wedding?.title || `${wedding?.brideName} & ${wedding?.groomName}`;

    for (const g of pending) {
      if (!g.email) {
        skippedNoEmail++;
        continue;
      }
      if (remindedRecently(g.lastReminderSentAt)) {
        skippedRecent++;
        continue;
      }
      const inviteUrl = cleanBase
        ? `${cleanBase}/invite/${g.invitationToken}`
        : `/invite/${g.invitationToken}`;
      try {
        await sendGuestReminderEmail({
          to: g.email,
          guestName: g.name,
          coupleName,
          weddingDate: wedding?.weddingDate,
          venue:
            wedding?.location?.formattedAddress ||
            wedding?.location?.city ||
            "Royal Celebration Venue",
          inviteUrl,
          isFamily: g.isFamily,
          maxGuests: g.maxGuests,
          subject: options?.subject,
          tone: options?.templateType,
        });
        emailsSent++;
        remindedIds.push(g._id);
      } catch (err) {
        emailsFailed++;
        if (!emailError) {
          const reason = err instanceof GuestEmailError ? err.reason : null;
          emailError =
            reason === "DOMAIN_NOT_VERIFIED"
              ? "The wedding email sender is not verified yet."
              : reason === "TEST_MODE"
                ? "Wedding email is still in test mode, so the reminder was not delivered."
                : reason === "CONFIG_MISSING"
                  ? "Wedding email is not set up yet."
                  : "The reminder email could not be delivered.";
        }
      }
    }
  }

  if (remindedIds.length > 0) {
    await Guest.updateMany(
      { _id: { $in: remindedIds } },
      {
        $set: { lastReminderSentAt: new Date() },
        $inc: { reminderCount: 1 },
      },
    );
  }

  return {
    sentCount: remindedIds.length,
    emailsSent,
    emailsFailed,
    skippedNoEmail,
    skippedRecent,
    emailError,
  };
}

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function remindedRecently(
  value: Date | string | null | undefined,
  now = Date.now(),
) {
  if (!value) return false;
  const sentAt =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(sentAt) && now - sentAt < REMINDER_COOLDOWN_MS;
}

export async function resolvePublicInvitation(
  token: string,
): Promise<PublicInvitationDto> {
  await connectToDatabase();

  const guest = await Guest.findOne({ invitationToken: token })
    .select("+invitationToken")
    .lean();

  if (!guest) {
    throw new WeddingError("NOT_FOUND", "Invitation not found.", 404);
  }

  const wedding = await Wedding.findOne({
    _id: guest.weddingId,
    deletedAt: null,
  }).lean();

  if (!wedding) {
    throw new WeddingError("NOT_FOUND", "Wedding celebration not found.", 404);
  }

  // Empty means invited to none. A missing field is not a licence to show
  // every celebration on the wedding.
  const invitedEventIds = Array.isArray(guest.invitedEventIds)
    ? guest.invitedEventIds
    : [];
  const eventFilter = {
    weddingId: wedding._id,
    _id: {
      $in: invitedEventIds.map((id) => new mongoose.Types.ObjectId(String(id))),
    },
    archivedAt: null,
  };

  const events = await Event.find(eventFilter).sort({ startsAt: 1 }).lean();

  return {
    guest: {
      name: guest.name,
      maxGuests: guest.maxGuests,
      isFamily: Boolean(guest.isFamily),
      rsvpStatus: guest.rsvpStatus as "PENDING" | "ATTENDING" | "NOT_ATTENDING",
      attendingCount: guest.attendingCount ?? null,
    },
    wedding: {
      title:
        wedding.title ||
        `${wedding.brideName} & ${wedding.groomName}'s Celebration`,
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate
        ? new Date(wedding.weddingDate).toISOString().slice(0, 10)
        : null,
      timeZone: wedding.timeZone || "Asia/Kolkata",
      location:
        wedding.location?.formattedAddress ||
        wedding.location?.city ||
        "Our Celebration Venue",
    },
    events: events.map((e) => ({
      id: String(e._id),
      name: e.name,
      type: e.type ?? null,
      startsAt: e.startsAt ? new Date(e.startsAt).toISOString() : null,
      endsAt: e.endsAt ? new Date(e.endsAt).toISOString() : null,
      venueName: e.venueName ?? null,
      address: e.address ?? null,
      dressCode: e.dressCode ?? null,
      description: e.description ?? null,
    })),
  };
}

// HMAC so a counter id cannot be reversed to the invitation secret. A missing
// secret fails closed rather than falling back to a hash of the raw token.
function invitationCounterKey(scope: "rsvp" | "invite", value: string) {
  const secret = process.env.MEMBER_INVITATION_SECRET;
  if (!secret || secret.length < 32) {
    throw new WeddingError(
      "INVITATION_NOT_CONFIGURED",
      "This invitation is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}

// Throttle public invitation reads. The per-token counter is consumed before the
// shared ceiling so one hammered link cannot exhaust the budget for every guest.
export async function consumePublicInvitationView(token: string) {
  await consumeLimit(`invite:${invitationCounterKey("invite", token)}`, 240);
  await consumeLimit("global:invite", 900, Date.now(), 60 * 1000);
}

export async function submitPublicRsvp(
  token: string,
  input: PublicRsvpInput,
): Promise<{
  status: "ATTENDING" | "NOT_ATTENDING";
  attendingCount: number;
  updatedAt: string;
}> {
  await connectToDatabase();

  const guest = await Guest.findOne({ invitationToken: token })
    .select("+invitationToken")
    .lean();

  if (!guest) {
    throw new WeddingError("NOT_FOUND", "Invitation not found.", 404);
  }

  const wedding = await Wedding.findOne({
    _id: guest.weddingId,
    deletedAt: null,
  })
    .select("_id")
    .lean();
  if (!wedding) {
    throw new WeddingError("NOT_FOUND", "Invitation not found.", 404);
  }

  if (input.status === "ATTENDING" && input.attendingCount > guest.maxGuests) {
    throw new WeddingError(
      "PARTY_SIZE_CHANGED",
      `Attendance cannot exceed your maximum party size of ${guest.maxGuests}.`,
      400,
    );
  }

  // Count this invitation before the shared ceiling. A missing link, a deleted
  // wedding, or an over-capacity reply never reaches either counter. The shared
  // ceiling is one minute; the invitation window stays 15 minutes.
  await consumeLimit(
    `rsvp:${invitationCounterKey("rsvp", String(guest._id))}`,
    20,
  );
  await consumeLimit("global:rsvp", 300, Date.now(), 60 * 1000);

  const attendingCount =
    input.status === "ATTENDING" ? input.attendingCount : 0;
  const rsvpUpdatedAt = new Date();
  // Compare-and-set on the document version so a concurrent member edit or a
  // second RSVP cannot be silently overwritten.
  const currentVersion = (guest as unknown as { __v?: number }).__v ?? 0;
  const updated = await Guest.findOneAndUpdate(
    { _id: guest._id, invitationToken: token, __v: currentVersion },
    {
      $set: {
        rsvpStatus: input.status,
        attendingCount,
        rsvpUpdatedAt,
      },
      $inc: { __v: 1 },
    },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    throw new WeddingError(
      "CONFLICT",
      "This invitation changed elsewhere. Reload and try again.",
      409,
    );
  }

  return {
    status: updated.rsvpStatus as "ATTENDING" | "NOT_ATTENDING",
    attendingCount: updated.attendingCount ?? 0,
    updatedAt: rsvpUpdatedAt.toISOString(),
  };
}
