import "server-only";
import { Types } from "mongoose";
import {
  Expense,
  type ExpenseCategory,
  type ExpensePaymentKind,
} from "./models";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesQuery,
} from "./schemas";
import { Event } from "@/modules/events/models";
import { WeddingMembership } from "@/modules/wedding/models";
import { User } from "@/modules/auth/models";
import { WeddingError } from "@/modules/wedding/errors";
import { connectToDatabase } from "@/server/db";

function calendarDate(value: string | Date, endOfDay = false) {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Expense date must be YYYY-MM-DD.",
      400,
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 12,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ),
  );
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Expense date must be a real calendar date.",
      400,
    );
  }
  return date;
}

export interface ExpenseDto {
  id: string;
  weddingId: string;
  title: string;
  amountPaise: number;
  amountRupees: number;
  currency: string;
  expenseDate: string;
  category: ExpenseCategory;
  paymentKind: ExpensePaymentKind;
  eventId: string | null;
  event: {
    id: string;
    name: string;
  } | null;
  vendorId: string | null;
  notes: string | null;
  createdByMembershipId: string;
  creator: {
    membershipId: string;
    name: string;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummaryDto {
  totalExpensePaise: number;
  totalExpenseRupees: number;
  currency: string;
  totalTransactions: number;
  advanceCount: number;
  advancePaise: number;
  advanceRupees: number;
  byPaymentKind: Array<{
    paymentKind: ExpensePaymentKind;
    amountPaise: number;
    amountRupees: number;
    count: number;
  }>;
  byCategory: Array<{
    category: ExpenseCategory;
    amountPaise: number;
    amountRupees: number;
    percentage: number;
    count: number;
  }>;
  byEvent: Array<{
    eventId: string;
    eventName: string;
    amountPaise: number;
    amountRupees: number;
    percentage: number;
  }>;
}

export interface RawExpense {
  _id: unknown;
  weddingId: unknown;
  title: string;
  amountPaise: number;
  currency?: string | null;
  expenseDate: Date;
  category: string;
  paymentKind?: string | null;
  eventId?: unknown;
  vendorId?: unknown;
  notes?: string | null;
  createdByMembershipId?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const PAYMENT_KINDS = new Set<ExpensePaymentKind>([
  "PAID",
  "ADVANCE",
  "PARTIAL",
  "FINAL",
]);

function paymentKindValue(
  value: string | null | undefined,
): ExpensePaymentKind {
  return value && PAYMENT_KINDS.has(value as ExpensePaymentKind)
    ? (value as ExpensePaymentKind)
    : "PAID";
}

function expenseDateValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()))
    return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

async function resolveAssociations(
  weddingId: string,
  expenses: RawExpense[],
): Promise<ExpenseDto[]> {
  const eventIds = Array.from(
    new Set(
      expenses
        .map((e) => e.eventId)
        .filter((id): id is Types.ObjectId => Boolean(id)),
    ),
  );

  const membershipIds = Array.from(
    new Set(
      expenses
        .map((e) => e.createdByMembershipId)
        .filter((id): id is Types.ObjectId => Boolean(id)),
    ),
  );

  const [events, memberships] = await Promise.all([
    eventIds.length > 0
      ? Event.find({ _id: { $in: eventIds }, weddingId }).lean()
      : [],
    membershipIds.length > 0
      ? WeddingMembership.find({
          _id: { $in: membershipIds },
          weddingId,
        }).lean()
      : [],
  ]);

  const userIds = memberships.map((m) => m.userId);
  const users =
    userIds.length > 0 ? await User.find({ _id: { $in: userIds } }).lean() : [];

  const eventMap = new Map(events.map((e) => [String(e._id), e]));
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const membershipMap = new Map(
    memberships.map((m) => {
      const user = userMap.get(String(m.userId));
      return [
        String(m._id),
        {
          membershipId: String(m._id),
          name: user?.name ?? "Wedding member",
          role: m.role,
        },
      ];
    }),
  );

  return expenses.map((expense) => {
    const rawEvent = expense.eventId
      ? eventMap.get(String(expense.eventId))
      : null;
    const rawCreator = expense.createdByMembershipId
      ? membershipMap.get(String(expense.createdByMembershipId))
      : null;

    const expenseDateStr = expenseDateValue(expense.expenseDate);

    return {
      id: String(expense._id),
      weddingId: String(expense.weddingId),
      title: expense.title,
      amountPaise: expense.amountPaise,
      amountRupees: expense.amountPaise / 100,
      currency: expense.currency || "INR",
      expenseDate: expenseDateStr,
      category: expense.category as ExpenseCategory,
      paymentKind: paymentKindValue(expense.paymentKind),
      eventId: expense.eventId ? String(expense.eventId) : null,
      event: rawEvent
        ? {
            id: String(rawEvent._id),
            name: rawEvent.name,
          }
        : null,
      vendorId: expense.vendorId ? String(expense.vendorId) : null,
      notes: expense.notes ?? null,
      createdByMembershipId: expense.createdByMembershipId
        ? String(expense.createdByMembershipId)
        : "",
      creator: rawCreator ?? null,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  });
}

export async function listExpenses(
  weddingId: string,
  query: ListExpensesQuery,
): Promise<{
  data: ExpenseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  await connectToDatabase();

  const filter: Record<string, unknown> = {
    weddingId: new Types.ObjectId(weddingId),
  };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.paymentKind) {
    filter.paymentKind = query.paymentKind;
  }

  if (query.eventId) {
    filter.eventId = new Types.ObjectId(query.eventId);
  }

  if (query.vendorId) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Vendor linking is not available yet.",
      400,
    );
  }

  if (query.from || query.to) {
    const dateFilter: Record<string, Date> = {};
    if (query.from) {
      dateFilter.$gte = calendarDate(query.from);
    }
    if (query.to) {
      dateFilter.$lte = calendarDate(query.to, true);
    }
    filter.expenseDate = dateFilter;
  }

  const page = query.page || 1;
  const limit = query.limit || 50;
  const skip = (page - 1) * limit;

  const [rawExpenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  const dtos = await resolveAssociations(
    weddingId,
    rawExpenses as unknown as RawExpense[],
  );

  return {
    data: dtos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function createExpense(
  weddingId: string,
  createdByMembershipId: string,
  input: CreateExpenseInput,
): Promise<ExpenseDto> {
  await connectToDatabase();

  if (input.eventId) {
    const event = await Event.findOne({
      _id: new Types.ObjectId(input.eventId),
      weddingId: new Types.ObjectId(weddingId),
    }).lean();

    if (!event) {
      throw new WeddingError(
        "NOT_FOUND",
        "Referenced event not found in this wedding.",
        404,
      );
    }
  }

  const expenseDate = calendarDate(input.expenseDate);

  const doc = await Expense.create({
    weddingId: new Types.ObjectId(weddingId),
    title: input.title,
    amountPaise: input.amountPaise,
    currency: input.currency ?? "INR",
    expenseDate,
    category: input.category,
    paymentKind: input.paymentKind,
    eventId: input.eventId ? new Types.ObjectId(input.eventId) : null,
    vendorId: null,
    notes: input.notes ?? null,
    createdByMembershipId: new Types.ObjectId(createdByMembershipId),
  });

  const [dto] = await resolveAssociations(weddingId, [
    doc.toObject() as unknown as RawExpense,
  ]);
  return dto;
}

export async function getExpense(
  weddingId: string,
  expenseId: string,
): Promise<ExpenseDto> {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(expenseId)) {
    throw new WeddingError("NOT_FOUND", "Expense not found.", 404);
  }

  const doc = await Expense.findOne({
    _id: new Types.ObjectId(expenseId),
    weddingId: new Types.ObjectId(weddingId),
  }).lean();

  if (!doc) {
    throw new WeddingError("NOT_FOUND", "Expense not found.", 404);
  }

  const [dto] = await resolveAssociations(weddingId, [
    doc as unknown as RawExpense,
  ]);
  return dto;
}

export async function updateExpense(
  weddingId: string,
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<ExpenseDto> {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(expenseId)) {
    throw new WeddingError("NOT_FOUND", "Expense not found.", 404);
  }

  const existing = await Expense.findOne({
    _id: new Types.ObjectId(expenseId),
    weddingId: new Types.ObjectId(weddingId),
  });

  if (!existing) {
    throw new WeddingError("NOT_FOUND", "Expense not found.", 404);
  }

  if (input.eventId) {
    const event = await Event.findOne({
      _id: new Types.ObjectId(input.eventId),
      weddingId: new Types.ObjectId(weddingId),
    }).lean();

    if (!event) {
      throw new WeddingError(
        "NOT_FOUND",
        "Referenced event not found in this wedding.",
        404,
      );
    }
    existing.eventId = new Types.ObjectId(input.eventId);
  } else if (input.eventId === null) {
    existing.eventId = null;
  }

  if (input.vendorId) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Vendor linking is not available yet.",
      400,
    );
  }
  if (input.vendorId === null) {
    existing.vendorId = null;
  }

  if (input.title !== undefined) existing.title = input.title;
  if (input.amountPaise !== undefined) existing.amountPaise = input.amountPaise;
  if (input.category !== undefined) existing.category = input.category;
  if (input.paymentKind !== undefined) existing.paymentKind = input.paymentKind;
  if (input.notes !== undefined) existing.notes = input.notes;
  if (input.expenseDate !== undefined) {
    existing.expenseDate = calendarDate(input.expenseDate);
  }

  await existing.save();

  const [dto] = await resolveAssociations(weddingId, [
    existing.toObject() as unknown as RawExpense,
  ]);
  return dto;
}

export async function deleteExpense(
  weddingId: string,
  expenseId: string,
): Promise<void> {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(expenseId)) {
    throw new WeddingError("NOT_FOUND", "Expense not found.", 404);
  }

  const res = await Expense.deleteOne({
    _id: new Types.ObjectId(expenseId),
    weddingId: new Types.ObjectId(weddingId),
  });

  if (res.deletedCount === 0) {
    throw new WeddingError("NOT_FOUND", "Expense not found.", 404);
  }
}

export async function getExpenseSummary(
  weddingId: string,
): Promise<ExpenseSummaryDto> {
  await connectToDatabase();
  const weddingObjectId = new Types.ObjectId(weddingId);
  const [grouped] = await Expense.aggregate<{
    totals: Array<{ amountPaise: number; count: number }>;
    byPaymentKind: Array<{
      _id: string | null;
      amountPaise: number;
      count: number;
    }>;
    byCategory: Array<{
      _id: string | null;
      amountPaise: number;
      count: number;
    }>;
    byEvent: Array<{ _id: Types.ObjectId | null; amountPaise: number }>;
  }>([
    { $match: { weddingId: weddingObjectId } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              amountPaise: { $sum: "$amountPaise" },
              count: { $sum: 1 },
            },
          },
        ],
        byPaymentKind: [
          {
            $group: {
              _id: { $ifNull: ["$paymentKind", "PAID"] },
              amountPaise: { $sum: "$amountPaise" },
              count: { $sum: 1 },
            },
          },
        ],
        byCategory: [
          {
            $group: {
              _id: { $ifNull: ["$category", "OTHER"] },
              amountPaise: { $sum: "$amountPaise" },
              count: { $sum: 1 },
            },
          },
        ],
        byEvent: [
          { $match: { eventId: { $ne: null } } },
          {
            $group: {
              _id: "$eventId",
              amountPaise: { $sum: "$amountPaise" },
            },
          },
        ],
      },
    },
  ]);

  const totalExpensePaise = grouped?.totals[0]?.amountPaise ?? 0;
  const totalTransactions = grouped?.totals[0]?.count ?? 0;
  const share = (amountPaise: number) =>
    totalExpensePaise > 0
      ? Math.round((amountPaise / totalExpensePaise) * 1000) / 10
      : 0;

  const byPaymentKind = (grouped?.byPaymentKind ?? [])
    .map((row) => {
      const paymentKind = paymentKindValue(row._id);
      return {
        paymentKind,
        amountPaise: row.amountPaise,
        amountRupees: row.amountPaise / 100,
        count: row.count,
      };
    })
    .sort((a, b) => b.amountPaise - a.amountPaise);
  const advance = byPaymentKind.find((row) => row.paymentKind === "ADVANCE");

  const byCategory = (grouped?.byCategory ?? [])
    .map((row) => ({
      category: (row._id || "OTHER") as ExpenseCategory,
      amountPaise: row.amountPaise,
      amountRupees: row.amountPaise / 100,
      percentage: share(row.amountPaise),
      count: row.count,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const eventRows = grouped?.byEvent ?? [];
  const events =
    eventRows.length > 0
      ? await Event.find({
          _id: { $in: eventRows.map((row) => row._id) },
          weddingId,
        }).lean()
      : [];
  const eventNameMap = new Map(
    events.map((event) => [String(event._id), event.name]),
  );
  const byEvent = eventRows
    .map((row) => ({
      eventId: String(row._id),
      eventName: eventNameMap.get(String(row._id)) || "Wedding ceremony",
      amountPaise: row.amountPaise,
      amountRupees: row.amountPaise / 100,
      percentage: share(row.amountPaise),
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  return {
    totalExpensePaise,
    totalExpenseRupees: totalExpensePaise / 100,
    currency: "INR",
    totalTransactions,
    advanceCount: advance?.count ?? 0,
    advancePaise: advance?.amountPaise ?? 0,
    advanceRupees: (advance?.amountPaise ?? 0) / 100,
    byPaymentKind,
    byCategory,
    byEvent,
  };
}
