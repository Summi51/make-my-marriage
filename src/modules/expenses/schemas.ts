import { z } from "zod";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_KINDS } from "./models";

export const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES);
export const expensePaymentKindSchema = z.enum(EXPENSE_PAYMENT_KINDS);

const MAX_AMOUNT_PAISE = 100_000_000_000;

function calendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const expenseDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expense date must be YYYY-MM-DD.")
  .refine(calendarDate, "Expense date must be a real calendar date.");

const amountPaiseSchema = z.coerce
  .number()
  .int("Amount must be a whole number of paise.")
  .positive("Amount must be greater than zero.")
  .max(MAX_AMOUNT_PAISE, "Amount is too large.");

export const createExpenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Expense title is required.")
    .max(120, "Title must be 120 characters or fewer."),
  amountPaise: amountPaiseSchema,
  currency: z.literal("INR").default("INR"),
  expenseDate: expenseDateSchema,
  category: expenseCategorySchema,
  paymentKind: expensePaymentKindSchema.default("PAID"),
  eventId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid event ID.")
    .nullable()
    .optional(),
  vendorId: z
    .null()
    .optional()
    .refine((value) => value == null, "Vendor linking is not available yet."),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be 1,000 characters or fewer.")
    .nullable()
    .optional(),
});

export const updateExpenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Expense title is required.")
    .max(120, "Title must be 120 characters or fewer.")
    .optional(),
  amountPaise: amountPaiseSchema.optional(),
  currency: z.literal("INR").optional(),
  expenseDate: expenseDateSchema.optional(),
  category: expenseCategorySchema.optional(),
  paymentKind: expensePaymentKindSchema.optional(),
  eventId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid event ID.")
    .nullable()
    .optional(),
  vendorId: z
    .null()
    .optional()
    .refine((value) => value == null, "Vendor linking is not available yet."),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be 1,000 characters or fewer.")
    .nullable()
    .optional(),
});

export const listExpensesQuerySchema = z.object({
  category: expenseCategorySchema.optional(),
  paymentKind: expensePaymentKindSchema.optional(),
  eventId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  vendorId: z.undefined().optional(),
  from: expenseDateSchema.optional(),
  to: expenseDateSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
