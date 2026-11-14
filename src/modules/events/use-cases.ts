import "server-only";
import type { z } from "zod";
import { Event } from "./models";
import type {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
} from "./schemas";
import { WeddingError } from "@/modules/wedding/errors";
import { connectToDatabase } from "@/server/db";

export function toEventDto(event: {
  _id: unknown;
  name: string;
  type?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  venueName?: string | null;
  address?: string | null;
  description?: string | null;
  dressCode?: string | null;
  archivedAt?: Date | null;
}) {
  return {
    id: String(event._id),
    name: event.name,
    type: event.type ?? null,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    venueName: event.venueName ?? null,
    address: event.address ?? null,
    description: event.description ?? null,
    dressCode: event.dressCode ?? null,
    archivedAt: event.archivedAt ? event.archivedAt.toISOString() : null,
  };
}

export async function listEvents(
  weddingId: string,
  query: z.infer<typeof listEventsQuerySchema>,
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { weddingId };
  if (!query.includeArchived) filter.archivedAt = null;
  if (query.from || query.to) {
    filter.startsAt = {
      ...(query.from ? { $gte: new Date(query.from) } : {}),
      ...(query.to ? { $lte: new Date(query.to) } : {}),
    };
  }
  const events = await Event.find(filter).sort({ startsAt: 1 }).lean();
  return events.map(toEventDto);
}

export async function createEvent(
  weddingId: string,
  input: z.infer<typeof createEventSchema>,
) {
  await connectToDatabase();
  const event = await Event.create({
    weddingId,
    name: input.name,
    type: input.type,
    startsAt: new Date(input.startsAt),
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    venueName: input.venueName ?? null,
    address: input.address ?? null,
    description: input.description ?? null,
    dressCode: input.dressCode ?? null,
  });
  return toEventDto(event);
}

export async function getEvent(weddingId: string, eventId: string) {
  await connectToDatabase();
  const event = await Event.findOne({ _id: eventId, weddingId }).lean();
  if (!event) throw new WeddingError("NOT_FOUND", "Event not found.", 404);
  return toEventDto(event);
}

export async function updateEvent(
  weddingId: string,
  eventId: string,
  input: z.infer<typeof updateEventSchema>,
) {
  await connectToDatabase();
  const current = await Event.findOne({ _id: eventId, weddingId });
  if (!current) throw new WeddingError("NOT_FOUND", "Event not found.", 404);
  if (current.archivedAt)
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Archived events are read-only.",
      400,
    );
  const update: Record<string, unknown> = {};
  for (const key of [
    "name",
    "type",
    "venueName",
    "address",
    "description",
    "dressCode",
  ] as const) {
    if (input[key] !== undefined) update[key] = input[key] ?? null;
  }
  const nextStart = input.startsAt
    ? new Date(input.startsAt)
    : current.startsAt;
  const nextEnd =
    input.endsAt !== undefined
      ? input.endsAt
        ? new Date(input.endsAt)
        : null
      : current.endsAt;
  if (nextEnd && nextEnd <= nextStart)
    throw new WeddingError(
      "VALIDATION_ERROR",
      "The end must be after the start.",
      400,
    );
  if (input.startsAt !== undefined) update.startsAt = nextStart;
  if (input.endsAt !== undefined) update.endsAt = nextEnd;
  const updated = await Event.findOneAndUpdate(
    { _id: eventId, weddingId, updatedAt: current.updatedAt },
    { $set: update },
    { returnDocument: "after" },
  ).lean();
  if (!updated)
    throw new WeddingError(
      "CONFLICT",
      "This event changed elsewhere. Reload and try again.",
      409,
    );
  return toEventDto(updated);
}

export async function countActiveEvents(weddingId: string) {
  await connectToDatabase();
  return Event.countDocuments({ weddingId, archivedAt: null });
}

export async function archiveEvent(weddingId: string, eventId: string) {
  await connectToDatabase();
  const event = await Event.findOneAndUpdate(
    { _id: eventId, weddingId, archivedAt: null },
    { $set: { archivedAt: new Date() } },
  );
  if (!event) throw new WeddingError("NOT_FOUND", "Event not found.", 404);
}

export async function restoreEvent(weddingId: string, eventId: string) {
  await connectToDatabase();
  const event = await Event.findOneAndUpdate(
    { _id: eventId, weddingId, archivedAt: { $ne: null } },
    { $set: { archivedAt: null } },
    { returnDocument: "after" },
  ).lean();
  if (!event) throw new WeddingError("NOT_FOUND", "Event not found.", 404);
  return toEventDto(event);
}
