import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    emailNormalized: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, collection: "users" },
);

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "sessions" },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const User =
  (mongoose.models.User as Model<InferSchemaType<typeof userSchema>>) ||
  mongoose.model("User", userSchema);
export const Session =
  (mongoose.models.Session as Model<InferSchemaType<typeof sessionSchema>>) ||
  mongoose.model("Session", sessionSchema);
