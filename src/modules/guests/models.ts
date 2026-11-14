import "server-only";
import { randomBytes } from "node:crypto";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const guestSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: null, trim: true },
    emailNormalized: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, default: null, trim: true },
    maxGuests: { type: Number, required: true, min: 1, default: 1 },
    isFamily: { type: Boolean, default: false },
    invitedEventIds: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    notes: { type: String, default: null },
    invitationToken: {
      type: String,
      required: true,
      unique: true,
      select: false,
      default: () => randomBytes(32).toString("base64url"),
    },
    invitationSentAt: { type: Date, default: null },
    lastReminderSentAt: { type: Date, default: null },
    reminderCount: { type: Number, default: 0 },
    rsvpStatus: {
      type: String,
      enum: ["PENDING", "ATTENDING", "NOT_ATTENDING"],
      default: "PENDING",
    },
    attendingCount: { type: Number, default: null },
    rsvpUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "guests" },
);

guestSchema.index({ weddingId: 1, rsvpStatus: 1 });
guestSchema.index({ weddingId: 1, name: 1 });
guestSchema.index({ weddingId: 1, emailNormalized: 1 });
guestSchema.index({ weddingId: 1, invitedEventIds: 1 });

export type GuestDocument = InferSchemaType<typeof guestSchema>;

export const Guest: Model<GuestDocument> =
  (mongoose.models.Guest as Model<GuestDocument>) ||
  mongoose.model<GuestDocument>("Guest", guestSchema);
