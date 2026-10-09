import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const eventSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    type: { type: String },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    venueName: { type: String },
    address: { type: String },
    description: { type: String },
    dressCode: { type: String },
    coverImageObjectKey: { type: String },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "events" },
);
eventSchema.index({ weddingId: 1, startsAt: 1 });

export type EventDocument = InferSchemaType<typeof eventSchema>;

export const Event: Model<EventDocument> =
  (mongoose.models.Event as Model<EventDocument>) ||
  mongoose.model<EventDocument>("Event", eventSchema);
