import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const photoSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    eventId: { type: Schema.Types.ObjectId, default: null },
    objectKey: { type: String, required: true },
    uploadKey: { type: String, required: true },
    originalFilename: { type: String },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploaderType: {
      type: String,
      enum: ["MEMBER", "GUEST"],
      required: true,
    },
    uploadedByMembershipId: { type: Schema.Types.ObjectId, default: null },
    status: {
      type: String,
      enum: ["PENDING", "READY", "DELETED"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "photos" },
);

photoSchema.index({ objectKey: 1 }, { unique: true });
photoSchema.index({ uploadKey: 1 }, { unique: true });
photoSchema.index({ weddingId: 1, status: 1, createdAt: -1, _id: -1 });
photoSchema.index({
  weddingId: 1,
  status: 1,
  eventId: 1,
  createdAt: -1,
  _id: -1,
});

export type PhotoDocument = InferSchemaType<typeof photoSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Photo: Model<PhotoDocument> =
  (mongoose.models.Photo as Model<PhotoDocument>) ||
  mongoose.model<PhotoDocument>("Photo", photoSchema);
