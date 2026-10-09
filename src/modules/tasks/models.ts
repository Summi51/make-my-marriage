import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const taskSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    assignedMembershipId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "WeddingMember",
    },
    eventId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Event",
    },
    dueDate: { type: Date, default: null },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "COMPLETED"],
      default: "TODO",
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "tasks" },
);

taskSchema.index({ weddingId: 1, status: 1 });
taskSchema.index({ weddingId: 1, dueDate: 1 });
taskSchema.index({ weddingId: 1, assignedMembershipId: 1, status: 1 });
taskSchema.index({ weddingId: 1, eventId: 1 });
taskSchema.index({ weddingId: 1, createdAt: -1 });

export type TaskDocument = InferSchemaType<typeof taskSchema>;

export const Task: Model<TaskDocument> =
  (mongoose.models.Task as Model<TaskDocument>) ||
  mongoose.model<TaskDocument>("Task", taskSchema);
