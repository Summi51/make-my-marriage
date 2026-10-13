import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const EXPENSE_CATEGORIES = [
  "VENUE",
  "CATERING",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "DECORATION",
  "CLOTHING",
  "JEWELLERY",
  "ENTERTAINMENT",
  "INVITATIONS",
  "GIFTS",
  "TRAVEL",
  "MAKEUP",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_PAYMENT_KINDS = [
  "PAID",
  "ADVANCE",
  "PARTIAL",
  "FINAL",
] as const;

export type ExpensePaymentKind = (typeof EXPENSE_PAYMENT_KINDS)[number];

const expenseSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR", enum: ["INR"] },
    expenseDate: { type: Date, required: true, default: Date.now },
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES,
      default: "OTHER",
    },
    paymentKind: {
      type: String,
      required: true,
      enum: EXPENSE_PAYMENT_KINDS,
      default: "PAID",
    },
    eventId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Event",
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Vendor",
    },
    notes: { type: String, default: null },
    createdByMembershipId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "WeddingMember",
    },
  },
  { timestamps: true, collection: "expenses" },
);

expenseSchema.index({ weddingId: 1, expenseDate: -1 });
expenseSchema.index({ weddingId: 1, category: 1 });
expenseSchema.index({ weddingId: 1, paymentKind: 1 });
expenseSchema.index({ weddingId: 1, eventId: 1 });
expenseSchema.index({ weddingId: 1, vendorId: 1 });
expenseSchema.index({ weddingId: 1, createdAt: -1 });

export type ExpenseDocument = InferSchemaType<typeof expenseSchema>;

// Next.js keeps Mongoose's model registry across development hot reloads.
// An older Expense model silently discards newly added paymentKind on save.
const registeredExpense = mongoose.models.Expense as
  Model<ExpenseDocument> | undefined;
if (registeredExpense && !registeredExpense.schema.path("paymentKind")) {
  mongoose.deleteModel("Expense");
}

export const Expense: Model<ExpenseDocument> =
  (mongoose.models.Expense as Model<ExpenseDocument>) ||
  mongoose.model<ExpenseDocument>("Expense", expenseSchema);
