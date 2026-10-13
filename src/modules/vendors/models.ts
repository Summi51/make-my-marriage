import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const VENDOR_CATEGORIES = [
  "PHOTOGRAPHER",
  "VIDEOGRAPHER",
  "VENUE",
  "CATERER",
  "DECORATOR",
  "DJ",
  "MAKEUP_ARTIST",
  "MEHENDI_ARTIST",
  "PANDIT",
  "CHOREOGRAPHER",
  "FLORIST",
  "WEDDING_PLANNER",
  "TRANSPORT",
  "OTHER",
] as const;

const vendorSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: VENDOR_CATEGORIES, required: true },
    contactPerson: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null },
    website: { type: String, default: null },
    totalAgreedCostPaise: { type: Number, default: null },
    eventIds: { type: [Schema.Types.ObjectId], default: [] },
    notes: { type: String, default: null },
    source: { type: String, enum: ["MANUAL", "GOOGLE_PLACES"], required: true },
    googlePlaceId: { type: String, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "vendors" },
);
vendorSchema.index({ weddingId: 1, category: 1 });
vendorSchema.index({ weddingId: 1, archivedAt: 1 });
vendorSchema.index(
  { weddingId: 1, googlePlaceId: 1 },
  {
    unique: true,
    partialFilterExpression: { googlePlaceId: { $type: "string" } },
  },
);

export type VendorDocument = InferSchemaType<typeof vendorSchema>;
export const Vendor: Model<VendorDocument> =
  (mongoose.models.Vendor as Model<VendorDocument>) ||
  mongoose.model<VendorDocument>("Vendor", vendorSchema);
