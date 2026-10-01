import "server-only";
import { createHash } from "node:crypto";
import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";
import { connectToDatabase } from "@/server/db";
import { AuthError } from "@/modules/auth/errors";

const schema = new Schema(
  {
    _id: String,
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "auth_rate_limits" },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Counter =
  (mongoose.models.AuthRateLimit as Model<InferSchemaType<typeof schema>>) ||
  mongoose.model("AuthRateLimit", schema);

export async function consumeLimit(
  key: string,
  limit: number,
  now = Date.now(),
) {
  await connectToDatabase();
  await Counter.init();
  const windowMs = 15 * 60 * 1000;
  const window = Math.floor(now / windowMs);
  const expiresAt = new Date((window + 1) * windowMs);
  const _id = createHash("sha256").update(`${key}:${window}`).digest("hex");
  let counter;
  try {
    counter = await Counter.findOneAndUpdate(
      { _id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" },
    ).lean();
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    counter = await Counter.findOneAndUpdate(
      { _id },
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    ).lean();
  }
  if (!counter || counter.count > limit)
    throw new AuthError(
      "RATE_LIMITED",
      "Too many attempts. Please try again later.",
      429,
      Math.ceil((expiresAt.getTime() - now) / 1000),
    );
}

export async function limitAuth(action: "signup" | "login", email: string) {
  await consumeLimit(`global:${action}`, action === "signup" ? 50 : 200);
  await consumeLimit(`email:${action}:${email}`, action === "signup" ? 5 : 10);
}
