import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/server/db";
import { WeddingError } from "@/modules/wedding/errors";
import { Event } from "@/modules/events/models";
import { Vendor } from "./models";
import type { CreateVendorInput, UpdateVendorInput } from "./schemas";

type VendorRow = {
  _id: unknown;
  name: string;
  category: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  meetingUrl?: string | null;
  totalAgreedCostPaise?: number | null;
  eventIds?: unknown[];
  notes?: string | null;
  source: string;
  googlePlaceId?: string | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function dto(row: VendorRow) {
  return {
    id: String(row._id),
    name: row.name,
    category: row.category,
    contactPerson: row.contactPerson ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    address: row.address ?? null,
    website: row.website ?? null,
    meetingUrl: row.meetingUrl ?? null,
    totalAgreedCostPaise: row.totalAgreedCostPaise ?? null,
    eventIds: (row.eventIds ?? []).map(String),
    notes: row.notes ?? null,
    source: row.source,
    googlePlaceId: row.googlePlaceId ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export type VendorDto = ReturnType<typeof dto>;

async function validateEvents(
  weddingId: string,
  eventIds: string[] | undefined,
) {
  if (!eventIds?.length) return;
  const ids = [...new Set(eventIds.map((id) => id.toLowerCase()))];
  if (ids.length !== eventIds.length)
    throw new WeddingError("VALIDATION_ERROR", "Choose each event once.", 400);
  const count = await Event.countDocuments({
    weddingId,
    _id: { $in: ids },
  });
  if (count !== ids.length)
    throw new WeddingError(
      "VALIDATION_ERROR",
      "An event is unavailable for this wedding.",
      400,
    );
}

export async function listVendors(
  weddingId: string,
  query: {
    category?: string;
    search?: string;
    includeArchived?: boolean;
    page: number;
    limit: number;
  },
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { weddingId };
  if (!query.includeArchived) filter.archivedAt = null;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { contactPerson: { $regex: escaped, $options: "i" } },
    ];
  }
  const [rows, total] = await Promise.all([
    Vendor.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Vendor.countDocuments(filter),
  ]);
  return {
    data: rows.map(dto),
    pagination: { page: query.page, limit: query.limit, total },
  };
}

export async function createVendor(
  weddingId: string,
  input: CreateVendorInput,
) {
  await connectToDatabase();
  await validateEvents(weddingId, input.eventIds);
  const row = await Vendor.create({
    weddingId,
    ...input,
    source: "MANUAL",
    googlePlaceId: null,
    eventIds: input.eventIds.map((id) => new Types.ObjectId(id)),
  });
  return dto(row.toObject());
}

export async function getVendor(weddingId: string, vendorId: string) {
  await connectToDatabase();
  const row = await Vendor.findOne({ _id: vendorId, weddingId }).lean();
  if (!row) throw new WeddingError("NOT_FOUND", "Vendor not found.", 404);
  return dto(row);
}

export async function updateVendor(
  weddingId: string,
  vendorId: string,
  input: UpdateVendorInput,
) {
  await connectToDatabase();
  await validateEvents(weddingId, input.eventIds);
  const update: Record<string, unknown> = { ...input };
  if (input.eventIds) {
    update.eventIds = input.eventIds.map((id) => new Types.ObjectId(id));
  }
  const row = await Vendor.findOneAndUpdate(
    { _id: vendorId, weddingId, archivedAt: null },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!row)
    throw new WeddingError("NOT_FOUND", "Active vendor not found.", 404);
  return dto(row);
}

export async function archiveVendor(weddingId: string, vendorId: string) {
  await connectToDatabase();
  const row = await Vendor.findOneAndUpdate(
    { _id: vendorId, weddingId, archivedAt: null },
    { $set: { archivedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!row)
    throw new WeddingError("NOT_FOUND", "Active vendor not found.", 404);
}

export async function restoreVendor(weddingId: string, vendorId: string) {
  await connectToDatabase();
  const row = await Vendor.findOneAndUpdate(
    { _id: vendorId, weddingId, archivedAt: { $ne: null } },
    { $set: { archivedAt: null } },
    { returnDocument: "after" },
  ).lean();
  if (!row)
    throw new WeddingError("NOT_FOUND", "Archived vendor not found.", 404);
  return dto(row);
}
