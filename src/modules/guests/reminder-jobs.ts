import "server-only";
import { randomUUID } from "node:crypto";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { Guest } from "./models";
import { Event } from "@/modules/events/models";
import { Wedding } from "@/modules/wedding/models";
import { connectToDatabase } from "@/server/db";
import { sendGuestReminderEmail } from "@/server/email/guest-notification";
import { buildGuestMessage } from "./messages";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_MS = 10 * 60 * 1000;

const reminderDispatchSchema = new Schema(
  {
    guestId: { type: Schema.Types.ObjectId, required: true },
    weddingId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ["RSVP", "EVENT"], required: true },
    eventId: { type: Schema.Types.ObjectId, default: null },
    channel: { type: String, enum: ["EMAIL", "WHATSAPP"], required: true },
    dispatchKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["READY", "SENDING", "SENT", "FAILED"],
      default: "READY",
    },
    message: { type: String, required: true },
    phone: { type: String, default: null },
    sentAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    lockId: { type: String, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true, collection: "guest_reminder_dispatches" },
);

type ReminderDispatch = InferSchemaType<typeof reminderDispatchSchema> & {
  _id: mongoose.Types.ObjectId;
};

const ReminderDispatch: Model<ReminderDispatch> =
  (mongoose.models.ReminderDispatch as Model<ReminderDispatch>) ||
  mongoose.model<ReminderDispatch>("ReminderDispatch", reminderDispatchSchema);

export type ReminderRunResult = {
  emailed: number;
  whatsappReady: number;
  skipped: number;
};

type DueReminder = {
  key: string;
  kind: "RSVP" | "EVENT";
  eventId?: mongoose.Types.ObjectId;
  occasionName?: string;
  whenLabel: string;
};

export async function runDueGuestReminders(
  now = new Date(),
): Promise<ReminderRunResult> {
  await connectToDatabase();
  const weddings = await Wedding.find({ deletedAt: null }).lean();
  let emailed = 0;
  let whatsappReady = 0;
  let skipped = 0;

  for (const wedding of weddings) {
    const due = await dueReminders(wedding, now);
    if (due.length === 0) continue;
    const counts = await dispatchWeddingReminders(wedding, due, now);
    emailed += counts.emailed;
    whatsappReady += counts.whatsappReady;
    skipped += counts.skipped;
  }

  return { emailed, whatsappReady, skipped };
}

async function dueReminders(
  wedding: {
    _id: mongoose.Types.ObjectId;
    weddingDate?: string | null;
    timeZone?: string | null;
  },
  now: Date,
) {
  const zone = wedding.timeZone || "Asia/Kolkata";
  const due: DueReminder[] = [];
  const today = calendarDay(now, zone);
  const weddingDay = wedding.weddingDate?.slice(0, 10);
  if (weddingDay && daysUntil(today, weddingDay) === 3) {
    due.push({
      key: `rsvp:${weddingDay}`,
      kind: "RSVP",
      whenLabel: formatDay(weddingDay),
    });
  }

  const events = await Event.find({
    weddingId: wedding._id,
    archivedAt: null,
    startsAt: { $gte: now, $lte: new Date(now.getTime() + 2 * DAY_MS) },
  }).lean();
  for (const event of events) {
    const eventDay = calendarDay(new Date(event.startsAt), zone);
    const lead = daysUntil(today, eventDay);
    if (lead !== 1 && lead !== 0) continue;
    due.push({
      key: `event:${String(event._id)}:${eventDay}`,
      kind: "EVENT",
      eventId: event._id,
      occasionName: event.name,
      whenLabel: new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        hourCycle: "h12",
        timeZone: zone,
      }).format(new Date(event.startsAt)),
    });
  }
  return due;
}

function calendarDay(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function daysUntil(today: string, target: string) {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${target}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / DAY_MS);
}

function formatDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

async function dispatchWeddingReminders(
  wedding: {
    _id: mongoose.Types.ObjectId;
    title?: string | null;
    brideName: string;
    groomName: string;
    location?: {
      formattedAddress?: string | null;
      venueName?: string | null;
      city?: string | null;
    } | null;
  },
  due: DueReminder[],
  now: Date,
) {
  const guests = await Guest.find({ weddingId: wedding._id })
    .select("+invitationToken")
    .lean();
  const couple = wedding.title || `${wedding.brideName} & ${wedding.groomName}`;
  const venue =
    wedding.location?.formattedAddress ||
    wedding.location?.venueName ||
    wedding.location?.city ||
    null;
  const origin = (process.env.APP_ORIGIN || "").replace(/\/$/, "");
  let emailed = 0;
  let whatsappReady = 0;
  let skipped = 0;

  for (const reminder of due) {
    const audience = guests.filter((guest) => guestMatches(guest, reminder));
    for (const guest of audience) {
      const message = buildGuestMessage({
        kind: reminder.kind === "EVENT" ? "event-reminder" : "rsvp-reminder",
        guestName: guest.name,
        coupleName: couple,
        dateLabel: reminder.whenLabel,
        venue,
        inviteUrl: origin
          ? `${origin}/invite/${guest.invitationToken}`
          : `/invite/${guest.invitationToken}`,
        isFamily: guest.isFamily,
        occasionName: reminder.occasionName,
      });
      const channels: Array<"EMAIL" | "WHATSAPP"> = [];
      if (guest.email) channels.push("EMAIL");
      if (guest.phone) channels.push("WHATSAPP");
      if (channels.length === 0) {
        skipped++;
        continue;
      }
      const inviteUrl = origin
        ? `${origin}/invite/${guest.invitationToken}`
        : `/invite/${guest.invitationToken}`;
      for (const channel of channels) {
        const result = await deliverOne(
          guest,
          reminder,
          channel,
          message,
          now,
          couple,
          inviteUrl,
        );
        if (result === "emailed") emailed++;
        if (result === "whatsapp") whatsappReady++;
        if (result === "skipped") skipped++;
      }
    }
  }
  return { emailed, whatsappReady, skipped };
}

function guestMatches(
  guest: {
    rsvpStatus?: string | null;
    invitedEventIds?: mongoose.Types.ObjectId[];
  },
  reminder: DueReminder,
) {
  if (reminder.kind === "RSVP") return guest.rsvpStatus === "PENDING";
  if (guest.rsvpStatus !== "ATTENDING") return false;
  // An empty selection means invited to none, matching the public invitation.
  if (!reminder.eventId || !guest.invitedEventIds?.length) return false;
  return guest.invitedEventIds.some(
    (id) => String(id) === String(reminder.eventId),
  );
}

async function deliverOne(
  guest: {
    _id: mongoose.Types.ObjectId;
    weddingId: mongoose.Types.ObjectId;
    name: string;
    email?: string | null;
    phone?: string | null;
    isFamily?: boolean;
  },
  reminder: DueReminder,
  channel: "EMAIL" | "WHATSAPP",
  message: string,
  now: Date,
  coupleName: string,
  inviteUrl: string,
) {
  const key = `${String(guest._id)}:${reminder.key}:${channel}`;
  const lockId = randomUUID();
  const claimed = await ReminderDispatch.findOneAndUpdate(
    {
      dispatchKey: key,
      $or: [
        { status: "FAILED" },
        {
          status: "SENDING",
          lockedAt: { $lt: new Date(now.getTime() - LOCK_MS) },
        },
      ],
    },
    {
      $set: {
        status: "SENDING",
        lockedAt: now,
        lockId,
        message,
        phone: guest.phone || null,
        lastError: null,
      },
      $setOnInsert: {
        guestId: guest._id,
        weddingId: guest.weddingId,
        kind: reminder.kind,
        eventId: reminder.eventId || null,
        channel,
        dispatchKey: key,
      },
    },
    { upsert: true, returnDocument: "after" },
  ).catch((error: { code?: number }) => {
    if (error.code === 11000) return null;
    throw error;
  });
  if (!claimed || claimed.lockId !== lockId) return "skipped" as const;

  if (channel === "WHATSAPP") {
    await ReminderDispatch.updateOne(
      { _id: claimed._id, lockId },
      { $set: { status: "READY", lockedAt: null, lockId: null } },
    );
    return "whatsapp" as const;
  }

  try {
    await sendGuestReminderEmail({
      to: guest.email || "",
      guestName: guest.name,
      coupleName,
      weddingDate: reminder.whenLabel,
      inviteUrl,
      isFamily: guest.isFamily,
      kind: reminder.kind === "EVENT" ? "event" : "rsvp",
      occasionName: reminder.occasionName,
    });
    // Mark the dispatch SENT first: it is the de-duplication record. Clearing
    // lockId keeps the failure handler from flipping a delivered email back to
    // FAILED (and retrying it) if the guest bookkeeping below fails.
    await ReminderDispatch.updateOne(
      { _id: claimed._id, lockId },
      {
        $set: {
          status: "SENT",
          sentAt: new Date(),
          lockedAt: null,
          lockId: null,
        },
      },
    );
    await Guest.updateOne(
      { _id: guest._id },
      {
        $set: { lastReminderSentAt: new Date() },
        $inc: { reminderCount: 1 },
      },
    ).catch(() => undefined);
    return "emailed" as const;
  } catch (error) {
    await ReminderDispatch.updateOne(
      { _id: claimed._id, lockId },
      {
        $set: {
          status: "FAILED",
          lockedAt: null,
          lastError: error instanceof Error ? error.message : "Email failed",
        },
      },
    );
    return "skipped" as const;
  }
}

export async function listReadyWhatsappReminders(weddingId: string) {
  await connectToDatabase();
  const rows = await ReminderDispatch.find({
    weddingId: new mongoose.Types.ObjectId(weddingId),
    channel: "WHATSAPP",
    status: "READY",
  })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    guestId: String(row.guestId),
    kind: row.kind,
    phone: row.phone,
    message: row.message,
  }));
}

export async function markWhatsappReminderOpened(
  weddingId: string,
  id: string,
) {
  await connectToDatabase();
  await ReminderDispatch.updateOne(
    {
      _id: new mongoose.Types.ObjectId(id),
      weddingId: new mongoose.Types.ObjectId(weddingId),
      channel: "WHATSAPP",
    },
    { $set: { status: "SENT", sentAt: new Date() } },
  );
}
