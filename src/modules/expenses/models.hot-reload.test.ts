import mongoose, { Schema } from "mongoose";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  if (mongoose.models.Expense) mongoose.deleteModel("Expense");
  vi.resetModules();
});

it("replaces a cached pre-payment-type Expense model during hot reload", async () => {
  if (mongoose.models.Expense) mongoose.deleteModel("Expense");
  mongoose.model("Expense", new Schema({ title: String }));

  const { Expense } = await import("./models");

  expect(Expense.schema.path("paymentKind")).toBeDefined();
  expect(mongoose.model("Expense")).toBe(Expense);
});
