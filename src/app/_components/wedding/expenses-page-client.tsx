"use client";

import { useMemo, useRef, useState } from "react";
import { tabFetch } from "@/lib/tab-session";
import type {
  ExpenseCategory,
  ExpensePaymentKind,
} from "@/modules/expenses/models";
import type {
  ExpenseDto,
  ExpenseSummaryDto,
} from "@/modules/expenses/use-cases";

interface WeddingMeta {
  id: string;
  title: string;
  brideName: string;
  groomName: string;
  weddingDate: string | null;
}

interface EventMeta {
  id: string;
  name: string;
}

interface ExpensesPageClientProps {
  wedding: WeddingMeta;
  initialExpenses: ExpenseDto[];
  initialTotal: number;
  initialSummary: ExpenseSummaryDto;
  events: EventMeta[];
}

const CATEGORY_COLORS: Record<
  ExpenseCategory,
  { bg: string; text: string; dot: string; border: string }
> = {
  VENUE: {
    bg: "bg-[#FDF2F4]",
    text: "text-[#872341]",
    dot: "#872341",
    border: "border-[#F8D7DA]",
  },
  CATERING: {
    bg: "bg-[#FFF8E7]",
    text: "text-[#B8860B]",
    dot: "#B8860B",
    border: "border-[#FFEBAA]",
  },
  PHOTOGRAPHY: {
    bg: "bg-[#F4EFF6]",
    text: "text-[#6D213C]",
    dot: "#6D213C",
    border: "border-[#E8DAEC]",
  },
  VIDEOGRAPHY: {
    bg: "bg-[#F0F4F8]",
    text: "text-[#2B4C7E]",
    dot: "#2B4C7E",
    border: "border-[#D6E4F0]",
  },
  DECORATION: {
    bg: "bg-[#F0F7F4]",
    text: "text-[#2E7D32]",
    dot: "#2E7D32",
    border: "border-[#C8E6C9]",
  },
  CLOTHING: {
    bg: "bg-[#FBF0F3]",
    text: "text-[#AD1457]",
    dot: "#AD1457",
    border: "border-[#F8BBD0]",
  },
  JEWELLERY: {
    bg: "bg-[#FFF9E6]",
    text: "text-[#D4AF37]",
    dot: "#D4AF37",
    border: "border-[#FFE082]",
  },
  ENTERTAINMENT: {
    bg: "bg-[#F3E5F5]",
    text: "text-[#7B1FA2]",
    dot: "#7B1FA2",
    border: "border-[#E1BEE7]",
  },
  INVITATIONS: {
    bg: "bg-[#EFEBE9]",
    text: "text-[#5D4037]",
    dot: "#5D4037",
    border: "border-[#D7CCC8]",
  },
  GIFTS: {
    bg: "bg-[#E0F2F1]",
    text: "text-[#00796B]",
    dot: "#00796B",
    border: "border-[#B2DFDB]",
  },
  TRAVEL: {
    bg: "bg-[#E3F2FD]",
    text: "text-[#1565C0]",
    dot: "#1565C0",
    border: "border-[#BBDEFB]",
  },
  MAKEUP: {
    bg: "bg-[#FCE4EC]",
    text: "text-[#C2185B]",
    dot: "#C2185B",
    border: "border-[#F8BBD0]",
  },
  OTHER: {
    bg: "bg-[#F5F5F5]",
    text: "text-[#616161]",
    dot: "#757575",
    border: "border-[#E0E0E0]",
  },
};

const ALL_CATEGORIES: ExpenseCategory[] = [
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
];

function formatIndianCurrency(rupees: number): string {
  const negative = rupees < 0;
  const absolute = Math.abs(rupees);
  const whole = Math.floor(absolute + 1e-8);
  const paise = Math.round((absolute - whole) * 100);
  const parts = whole.toString();
  const grouped =
    parts.length <= 3
      ? parts
      : parts.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
        "," +
        parts.slice(-3);
  const fraction = paise > 0 ? `.${String(paise).padStart(2, "0")}` : "";
  return `${negative ? "-" : ""}₹${grouped}${fraction}`;
}

const PAYMENT_KINDS: Array<{
  value: ExpensePaymentKind;
  label: string;
  hint: string;
}> = [
  { value: "PAID", label: "Paid in full", hint: "One complete payment" },
  { value: "ADVANCE", label: "Advance paid", hint: "Deposit already given" },
  {
    value: "PARTIAL",
    label: "Part payment",
    hint: "Another amount already paid",
  },
  {
    value: "FINAL",
    label: "Final payment",
    hint: "Closing amount already paid",
  },
];

function categoryLabel(category: string) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function paymentKindLabel(kind: string) {
  return PAYMENT_KINDS.find((item) => item.value === kind)?.label ?? "Paid";
}

function todayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function errorMessage(
  data: { error?: { message?: string } } | null,
  fallback: string,
) {
  return data?.error?.message || fallback;
}

const PAGE_SIZE = 100;

export function ExpensesPageClient({
  wedding,
  initialExpenses,
  initialTotal,
  initialSummary,
  events,
}: ExpensesPageClientProps) {
  const [expenses, setExpenses] = useState<ExpenseDto[]>(initialExpenses);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [exportSubmitting, setExportSubmitting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExpenseSummaryDto>(initialSummary);
  const [activeTab, setActiveTab] = useState<
    "all" | "by_category" | "by_event" | "advances"
  >("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseDto | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseDto | null>(
    null,
  );
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formAmountRupees, setFormAmountRupees] = useState("");
  const [formDate, setFormDate] = useState(todayDate());
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("CATERING");
  const [formPaymentKind, setFormPaymentKind] =
    useState<ExpensePaymentKind>("PAID");
  const [formEventId, setFormEventId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const formLock = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesNotes = exp.notes?.toLowerCase().includes(q) ?? false;
        const matchesEvent = exp.event?.name.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesNotes && !matchesEvent) return false;
      }
      if (categoryFilter !== "ALL" && exp.category !== categoryFilter) {
        return false;
      }
      if (eventFilter !== "ALL") {
        if (eventFilter === "GENERAL" && exp.eventId !== null) return false;
        if (eventFilter !== "GENERAL" && exp.eventId !== eventFilter)
          return false;
      }
      if (activeTab === "advances" && exp.paymentKind !== "ADVANCE") {
        return false;
      }
      return true;
    });
  }, [expenses, searchQuery, categoryFilter, eventFilter, activeTab]);

  const groupedExpenses = useMemo(() => {
    if (activeTab !== "by_category" && activeTab !== "by_event") return [];
    const groups = new Map<string, { label: string; items: ExpenseDto[] }>();
    for (const expense of filteredExpenses) {
      const key =
        activeTab === "by_category"
          ? expense.category
          : (expense.eventId ?? "GENERAL");
      const label =
        activeTab === "by_category"
          ? categoryLabel(expense.category)
          : (expense.event?.name ?? "General / All");
      const group = groups.get(key) ?? { label, items: [] };
      group.items.push(expense);
      groups.set(key, group);
    }
    return Array.from(groups.entries())
      .map(([key, group]) => ({
        key,
        label: group.label,
        items: group.items,
        amountRupees: group.items.reduce(
          (sum, item) => sum + item.amountRupees,
          0,
        ),
      }))
      .sort((a, b) => b.amountRupees - a.amountRupees);
  }, [activeTab, filteredExpenses]);

  const renderExpenseRow = (exp: ExpenseDto) => {
    const style = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.OTHER;
    const kind = exp.paymentKind || "PAID";
    return (
      <tr key={exp.id} className="transition hover:bg-[#FCFAF8]">
        <td className="py-3.5 pr-4 pl-6 font-medium text-[#1F1E1D]">
          {exp.expenseDate}
        </td>
        <td className="px-4 py-3.5">
          <p className="font-semibold text-[#1F1E1D]">{exp.title}</p>
          {exp.notes && (
            <p className="mt-0.5 text-[11px] text-[#8C837A]">{exp.notes}</p>
          )}
        </td>
        <td className="px-4 py-3.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text} ${style.border}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: style.dot }}
            />
            {categoryLabel(exp.category)}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <span className="inline-block rounded-md bg-[#FAF7F5] px-2 py-0.5 text-[11px] font-medium text-[#6B645D]">
            {exp.event ? exp.event.name : "General / All"}
          </span>
        </td>
        <td className="px-4 py-3.5 font-bold text-[#1F1E1D]">
          {formatIndianCurrency(exp.amountRupees)}
        </td>
        <td className="px-4 py-3.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              kind === "ADVANCE"
                ? "bg-[#FFF8E7] text-[#B8860B]"
                : kind === "PARTIAL"
                  ? "bg-[#E3F2FD] text-[#1565C0]"
                  : kind === "FINAL"
                    ? "bg-[#F0F7F4] text-[#2E7D32]"
                    : "bg-[#FAF7F5] text-[#6B645D]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                kind === "ADVANCE"
                  ? "bg-[#B8860B]"
                  : kind === "PARTIAL"
                    ? "bg-[#1565C0]"
                    : kind === "FINAL"
                      ? "bg-[#2E7D32]"
                      : "bg-[#8C837A]"
              }`}
            />
            {paymentKindLabel(kind)}
          </span>
        </td>
        <td className="py-3.5 pr-6 pl-4 text-right">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditModal(exp)}
              className="cursor-pointer text-[#8C837A] transition hover:text-[#6D213C]"
              title="Edit Expense"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeletingExpense(exp);
              }}
              className="cursor-pointer text-[#8C837A] transition hover:text-[#C62828]"
              title="Delete Expense"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setFormTitle("");
    setFormAmountRupees("");
    setFormDate(todayDate());
    setFormCategory("CATERING");
    setFormPaymentKind("PAID");
    setFormEventId("");
    setFormNotes("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (expense: ExpenseDto) => {
    setEditingExpense(expense);
    setFormTitle(expense.title);
    setFormAmountRupees(expense.amountRupees.toString());
    setFormDate(expense.expenseDate);
    setFormCategory(expense.category);
    setFormPaymentKind(expense.paymentKind || "PAID");
    setFormEventId(expense.eventId || "");
    setFormNotes(expense.notes || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLock.current) return;
    formLock.current = true;
    setFormError(null);

    const title = formTitle.trim();
    if (!title) {
      formLock.current = false;
      setFormError("Expense title is required.");
      return;
    }

    const rupees = Number(formAmountRupees);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      formLock.current = false;
      setFormError("Please enter a valid amount greater than 0.");
      return;
    }
    if (rupees > 1_000_000_000) {
      formLock.current = false;
      setFormError("Amount is too large.");
      return;
    }

    const amountPaise = Math.round(rupees * 100);
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) {
      formLock.current = false;
      setFormError("Please enter a valid amount greater than 0.");
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        title,
        amountPaise,
        currency: "INR",
        expenseDate: formDate,
        category: formCategory,
        paymentKind: formPaymentKind,
        eventId: formEventId || null,
        notes: formNotes.trim() || null,
      };
      const res = editingExpense
        ? await tabFetch(`/api/expenses/${editingExpense.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await tabFetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = (await res.json().catch(() => null)) as {
        data?: ExpenseDto;
        error?: { message?: string };
      } | null;
      if (!res.ok || !data?.data) {
        throw new Error(
          errorMessage(
            data,
            editingExpense
              ? "Failed to update expense."
              : "Failed to record expense.",
          ),
        );
      }
      const saved = data.data;
      setExpenses((prev) => {
        const next = editingExpense
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev];
        return next.sort((a, b) => {
          const byDate = b.expenseDate.localeCompare(a.expenseDate);
          return byDate || b.createdAt.localeCompare(a.createdAt);
        });
      });
      if (!editingExpense) setTotal((count) => count + 1);

      const summaryRes = await tabFetch("/api/expenses/summary", {
        cache: "no-store",
      });
      if (summaryRes.ok) {
        const summaryData = (await summaryRes.json()) as {
          data?: ExpenseSummaryDto;
        };
        if (summaryData.data) setSummary(summaryData.data);
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      formLock.current = false;
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingExpense || deleteSubmitting) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const res = await tabFetch(`/api/expenses/${deletingExpense.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(errorMessage(data, "Failed to delete expense."));
      }
      setExpenses((prev) =>
        prev.filter((item) => item.id !== deletingExpense.id),
      );
      setTotal((count) => Math.max(0, count - 1));
      const summaryRes = await tabFetch("/api/expenses/summary", {
        cache: "no-store",
      });
      if (summaryRes.ok) {
        const summaryData = (await summaryRes.json()) as {
          data?: ExpenseSummaryDto;
        };
        if (summaryData.data) setSummary(summaryData.data);
      }
      setDeletingExpense(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete expense.",
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || expenses.length >= total) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const nextPage = page + 1;
      const res = await tabFetch(
        `/api/expenses?page=${nextPage}&limit=${PAGE_SIZE}`,
        { cache: "no-store" },
      );
      const data = (await res.json().catch(() => null)) as {
        data?: ExpenseDto[];
        pagination?: { page?: number; total?: number };
        error?: { message?: string };
      } | null;
      if (!res.ok || !data?.data) {
        throw new Error(errorMessage(data, "Could not load more expenses."));
      }
      setExpenses((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [
          ...prev,
          ...data.data!.filter((item) => !seen.has(item.id)),
        ].sort((a, b) => {
          const byDate = b.expenseDate.localeCompare(a.expenseDate);
          return byDate || b.createdAt.localeCompare(a.createdAt);
        });
      });
      setPage(data.pagination?.page ?? nextPage);
      if (typeof data.pagination?.total === "number") {
        setTotal(data.pagination.total);
      }
    } catch (err) {
      setLoadMoreError(
        err instanceof Error ? err.message : "Could not load more expenses.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExportCSV = async () => {
    if (total === 0 || exportSubmitting) return;
    setExportSubmitting(true);
    setExportError(null);
    try {
      const rowsSource: ExpenseDto[] = [];
      let nextPage = 1;
      let pages = 1;
      do {
        const res = await tabFetch(
          `/api/expenses?page=${nextPage}&limit=${PAGE_SIZE}`,
          { cache: "no-store" },
        );
        const data = (await res.json().catch(() => null)) as {
          data?: ExpenseDto[];
          pagination?: { totalPages?: number };
          error?: { message?: string };
        } | null;
        if (!res.ok || !data?.data) {
          throw new Error(errorMessage(data, "Could not export expenses."));
        }
        rowsSource.push(...data.data);
        pages = data.pagination?.totalPages ?? 1;
        nextPage += 1;
      } while (nextPage <= pages && nextPage <= 100);

      const headers = [
        "Date",
        "Title",
        "Category",
        "Payment type",
        "Amount (INR)",
        "Event",
        "Recorded By",
        "Notes",
      ];
      const csvCell = (value: string) => {
        const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const rows = rowsSource.map((expense) => [
        csvCell(expense.expenseDate),
        csvCell(expense.title),
        csvCell(expense.category),
        csvCell(paymentKindLabel(expense.paymentKind || "PAID")),
        expense.amountRupees,
        csvCell(expense.event?.name || "General"),
        csvCell(expense.creator?.name || ""),
        csvCell(expense.notes || ""),
      ]);
      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const safeName = `${wedding.brideName}_and_${wedding.groomName}`
        .replace(/[^A-Za-z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Wedding_Expenses_${safeName || "ledger"}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Could not export expenses.",
      );
    } finally {
      setExportSubmitting(false);
    }
  };

  const topCategory = summary.byCategory[0] || null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumb & Status Tag */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#9A435E] uppercase">
            Workspace &gt; Expenses &nbsp;•&nbsp; Your Celebration, Beautifully
            Managed
          </p>
          <p className="mt-1 text-xs font-medium tracking-wider text-[#A29A91] uppercase">
            Recorded spending
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EBE3DC] bg-[#FAF7F5] px-3 py-1 text-xs font-medium text-[#7A7269]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6D213C]" />
            {wedding.weddingDate
              ? `Wedding year ${wedding.weddingDate.slice(0, 4)}`
              : "Wedding ledger"}
          </span>
        </div>
      </div>

      {/* Main Page Title Header */}
      <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-editorial text-4xl text-[#1F1E1D] sm:text-5xl">
            Wedding expenses
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B645D]">
            Record payments and advances already made for your wedding. Saving
            an expense does not send money to a vendor or a guest.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#EAE3DC] bg-white px-3.5 py-2.5 shadow-xs">
            <svg
              className="h-4 w-4 text-[#8C3A52]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect
                x="2"
                y="6"
                width="20"
                height="12"
                rx="2"
                strokeWidth="1.75"
              />
              <circle cx="12" cy="12" r="3" strokeWidth="1.75" />
              <path strokeWidth="1.75" d="M6 12h.01M18 12h.01" />
            </svg>
            <span className="text-sm font-bold text-[#1F1E1D]">
              {formatIndianCurrency(summary.totalExpenseRupees)}
            </span>
            <span className="text-xs text-[#8C837A]">total paid</span>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={total === 0 || exportSubmitting}
            title="Export CSV Ledger"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAE3DC] bg-white text-[#5C554E] transition hover:bg-[#FAF7F5] hover:text-[#1F1E1D] disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#6D213C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#581A30]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add expense</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs matching Stitch Screenshot */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-[#EAE3DC] pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "all"
              ? "bg-[#6D213C] text-white shadow-xs"
              : "bg-white text-[#7A7269] hover:bg-[#FAF7F5] hover:text-[#1F1E1D]"
          }`}
        >
          All expenses
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("by_category")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "by_category"
              ? "bg-[#6D213C] text-white shadow-xs"
              : "bg-white text-[#7A7269] hover:bg-[#FAF7F5] hover:text-[#1F1E1D]"
          }`}
        >
          By Category
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("by_event")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "by_event"
              ? "bg-[#6D213C] text-white shadow-xs"
              : "bg-white text-[#7A7269] hover:bg-[#FAF7F5] hover:text-[#1F1E1D]"
          }`}
        >
          By Ceremony / Event
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("advances")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "advances"
              ? "bg-[#6D213C] text-white shadow-xs"
              : "bg-white text-[#7A7269] hover:bg-[#FAF7F5] hover:text-[#1F1E1D]"
          }`}
        >
          Advances paid
        </button>
      </div>

      {/* Main Body: Either Empty State OR Populated Overview + Table */}
      {expenses.length === 0 ? (
        /* Stitch Empty State matching Image 1 */
        <div className="mt-8 space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-[#EAE3DC] bg-white px-6 py-16 text-center shadow-xs sm:px-12">
            {/* Background geometric decorative watermarks */}
            <div className="pointer-events-none absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full border border-[#F4ECE6] opacity-60" />
            <div className="pointer-events-none absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full border border-[#F4ECE6] opacity-60" />

            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FAF3F5]">
              <svg
                className="h-10 w-10 text-[#6D213C]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect
                  x="4"
                  y="3"
                  width="16"
                  height="18"
                  rx="2"
                  strokeWidth="1.6"
                />
                <path strokeWidth="1.6" d="M8 7h8M8 11h5" />
                <circle cx="15.5" cy="14.5" r="2.5" strokeWidth="1.6" />
                <path strokeWidth="1.4" d="M15 13.5h1M15 15h1" />
              </svg>
            </div>

            <p className="mt-6 text-[11px] font-bold tracking-[0.2em] text-[#9A435E] uppercase">
              Every Rupee Accounted For
            </p>
            <h2 className="font-editorial mt-2 text-3xl text-[#1F1E1D] sm:text-4xl">
              No expenses recorded yet
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#6B645D]">
              Keep track of every rupee spent, advances given to caterers and
              photographers, and ceremony costs in one organized place.
            </p>

            <div className="mt-8">
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#6D213C] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#581A30]"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Record your first expense</span>
              </button>
            </div>

            <p className="mt-5 text-xs text-[#8C837A]">
              <span className="inline-block text-[#2E7D32]">✓</span> Includes
              automatic organization across traditional wedding ceremonies
            </p>
          </div>

          {/* 3 Helper Feature Cards matching Stitch Image 1 */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#EAE3DC] bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF3F5] text-[#6D213C]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M7 7h10v10H7z"
                  />
                </svg>
              </div>
              <h3 className="font-editorial mt-4 text-lg font-medium text-[#1F1E1D]">
                Categorize Easily
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#6B645D]">
                Organize costs into Venue, Decor, Catering &amp; 10+ categories
                tailored for traditional South Asian celebrations.
              </p>
              <span className="mt-4 inline-block text-[11px] font-semibold tracking-wider text-[#9A435E] uppercase">
                Choose a category
              </span>
            </div>

            <div className="rounded-2xl border border-[#EAE3DC] bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8E7] text-[#B8860B]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-editorial mt-4 text-lg font-medium text-[#1F1E1D]">
                Link to Events
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#6B645D]">
                See exactly how much each ceremony costs—from the Sangeet
                cocktails to the Nikah stage and Grand Walima feast.
              </p>
              <span className="mt-4 inline-block text-[11px] font-semibold tracking-wider text-[#B8860B] uppercase">
                Ceremony Breakdowns →
              </span>
            </div>

            <div className="rounded-2xl border border-[#EAE3DC] bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7F4] text-[#2E7D32]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="font-editorial mt-4 text-lg font-medium text-[#1F1E1D]">
                Stay in Sync
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#6B645D]">
                Admins and managers of this wedding see the same recorded
                expenses. Refresh the page to see another member&apos;s latest
                entry.
              </p>
              <span className="mt-4 inline-block text-[11px] font-semibold tracking-wider text-[#2E7D32] uppercase">
                Shared wedding ledger
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Populated State with 3 High-Fidelity Overview KPI Cards matching Image 2 */
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Card 1: Total Wedding Expenses with Trendline */}
            <div className="rounded-3xl border border-[#EAE3DC] bg-white p-6 shadow-xs">
              <p className="text-xs font-semibold tracking-wider text-[#8C837A] uppercase">
                Total Paid
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-editorial text-3xl font-bold text-[#1F1E1D] sm:text-4xl">
                  {formatIndianCurrency(summary.totalExpenseRupees)}
                </span>
                <span className="text-xs text-[#8C837A]">(INR)</span>
              </div>
              <p className="mt-1 text-xs text-[#6B645D]">
                {summary.totalTransactions}{" "}
                {summary.totalTransactions === 1
                  ? "recorded expense"
                  : "recorded expenses"}
              </p>

              <p className="mt-4 text-xs leading-5 text-[#8C837A]">
                Includes advances and part payments. Remaining vendor balances
                and future payments are not tracked here.
              </p>
            </div>

            {/* Card 2: Category Breakdown Donut Chart */}
            <div className="rounded-3xl border border-[#EAE3DC] bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wider text-[#8C837A] uppercase">
                  Category Breakdown
                </p>
                <span className="text-xs font-medium text-[#6D213C]">
                  {summary.byCategory.length} Categories
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                {/* SVG Donut Chart */}
                <div className="relative h-28 w-28 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="transparent"
                      stroke="#F4EBF0"
                      strokeWidth="4"
                    />
                    {
                      summary.byCategory.slice(0, 4).reduce(
                        (acc, cat, idx) => {
                          const dashLength = cat.percentage;
                          const dashOffset = 100 - acc.accumulated;
                          const strokeColor =
                            idx === 0
                              ? "#6D213C"
                              : idx === 1
                                ? "#B8860B"
                                : idx === 2
                                  ? "#2E7D32"
                                  : "#7B1FA2";

                          acc.elements.push(
                            <circle
                              key={cat.category}
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="transparent"
                              stroke={strokeColor}
                              strokeWidth="4"
                              strokeDasharray={`${dashLength} ${100 - dashLength}`}
                              strokeDashoffset={dashOffset}
                            />,
                          );
                          acc.accumulated += dashLength;
                          return acc;
                        },
                        { accumulated: 0, elements: [] as React.ReactNode[] },
                      ).elements
                    }
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-[#1F1E1D]">
                      {summary.byCategory[0]?.percentage || 0}%
                    </span>
                    <span className="text-[9px] text-[#8C837A]">Top</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 space-y-1.5 text-xs">
                  {summary.byCategory.slice(0, 4).map((c, i) => (
                    <div
                      key={c.category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              i === 0
                                ? "#6D213C"
                                : i === 1
                                  ? "#B8860B"
                                  : i === 2
                                    ? "#2E7D32"
                                    : "#7B1FA2",
                          }}
                        />
                        <span className="truncate text-[#5C554E] capitalize">
                          {c.category.toLowerCase()}
                        </span>
                      </div>
                      <span className="font-semibold text-[#1F1E1D]">
                        {c.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {topCategory && (
                <div className="mt-4 rounded-xl bg-[#FAF7F5] p-2.5 text-center text-xs text-[#6B645D]">
                  Leading spend:{" "}
                  <span className="font-bold text-[#6D213C]">
                    {topCategory.category}
                  </span>{" "}
                  ({formatIndianCurrency(topCategory.amountRupees)})
                </div>
              )}
            </div>

            {/* Card 3: Recent Entries */}
            <div className="rounded-3xl border border-[#EAE3DC] bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wider text-[#8C837A] uppercase">
                  Recent Entries
                </p>
                <span className="text-xs text-[#8C837A]">
                  {summary.totalTransactions} recorded
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                {expenses.slice(0, 3).map((exp, idx) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between rounded-xl border border-[#F4EFEA] p-2.5 transition hover:bg-[#FAF7F5]"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF3F5] text-[10px] font-bold text-[#6D213C]">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="truncate text-xs font-semibold text-[#1F1E1D]">
                          {exp.title}
                        </p>
                        <p className="text-[10px] text-[#8C837A]">
                          {exp.expenseDate} · {exp.category.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#1F1E1D]">
                      {formatIndianCurrency(exp.amountRupees)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search, Filter Toolbar & Table Header */}
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="font-editorial text-2xl text-[#1F1E1D]">
                Recorded Wedding Expenses
              </h2>
              <button
                type="button"
                onClick={openAddModal}
                className="flex cursor-pointer items-center gap-2 self-start rounded-xl bg-[#6D213C] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#581A30]"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Add New Expense</span>
              </button>
            </div>

            {/* Filter Bar matching Image 2 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="relative sm:col-span-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, ceremony, or notes..."
                  className="w-full rounded-xl border border-[#EAE3DC] bg-white py-2.5 pr-4 pl-9 text-xs text-[#1F1E1D] shadow-xs placeholder:text-[#A29A91] focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
                />
                <svg
                  className="absolute top-3 left-3 h-4 w-4 text-[#A29A91]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" strokeWidth="1.8" />
                  <path
                    strokeLinecap="round"
                    strokeWidth="1.8"
                    d="M21 21l-4.35-4.35"
                  />
                </svg>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-[#EAE3DC] bg-white px-3 py-2.5 text-xs text-[#1F1E1D] shadow-xs focus:border-[#6D213C] focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ceremony / Event Filter */}
              <div>
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="w-full rounded-xl border border-[#EAE3DC] bg-white px-3 py-2.5 text-xs text-[#1F1E1D] shadow-xs focus:border-[#6D213C] focus:outline-none"
                >
                  <option value="ALL">All Ceremonies</option>
                  <option value="GENERAL">General / Overall</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expenses Table matching Image 2 */}
            <div className="overflow-hidden rounded-2xl border border-[#EAE3DC] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#EAE3DC] bg-[#FAF7F5] font-semibold text-[#7A7269]">
                    <tr>
                      <th className="py-3.5 pr-4 pl-6">Date</th>
                      <th className="px-4 py-3.5">
                        Expense Details &amp; Notes
                      </th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Ceremony</th>
                      <th className="px-4 py-3.5">Paid (₹)</th>
                      <th className="px-4 py-3.5">Payment type</th>
                      <th className="py-3.5 pr-6 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4EFEA]">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-[#8C837A]"
                        >
                          No expenses matching the selected filters.
                        </td>
                      </tr>
                    ) : activeTab === "by_category" ||
                      activeTab === "by_event" ? (
                      groupedExpenses.flatMap((group) => [
                        <tr key={`group-${group.key}`} className="bg-[#FAF7F5]">
                          <td
                            colSpan={7}
                            className="px-6 py-2.5 text-[11px] font-semibold tracking-wide text-[#6D213C] uppercase"
                          >
                            {group.label} · {group.items.length}{" "}
                            {group.items.length === 1 ? "expense" : "expenses"}{" "}
                            · {formatIndianCurrency(group.amountRupees)}
                          </td>
                        </tr>,
                        ...group.items.map((exp) => renderExpenseRow(exp)),
                      ])
                    ) : (
                      filteredExpenses.map((exp) => renderExpenseRow(exp))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-start justify-between gap-3 border-t border-[#EAE3DC] bg-[#FAF7F5] px-6 py-3 text-xs text-[#7A7269] sm:flex-row sm:items-center">
                <p>
                  Showing {filteredExpenses.length} of {expenses.length} loaded
                  {total > expenses.length ? ` · ${total} recorded` : ""}
                </p>
                {expenses.length < total && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="cursor-pointer rounded-xl border border-[#EAE3DC] bg-white px-3 py-1.5 text-xs font-semibold text-[#6D213C] hover:bg-[#FDF2F4] disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load more expenses"}
                  </button>
                )}
              </div>
              {loadMoreError && (
                <p className="border-t border-[#F8D7DA] bg-[#FDF2F4] px-6 py-2 text-xs text-[#872341]">
                  {loadMoreError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer bar matching Stitch Image 1 */}
      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#EAE3DC] pt-6 text-xs text-[#8C837A] sm:flex-row">
        <p className="font-editorial text-sm tracking-wide text-[#6D213C] uppercase">
          Editorial Wedding Finance
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <span>Recorded spending only</span>
          <span>•</span>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={total === 0 || exportSubmitting}
            className="cursor-pointer transition hover:text-[#1F1E1D] disabled:opacity-40"
          >
            {exportSubmitting ? "Exporting..." : "Export to Sheets"}
          </button>
          {exportError && <span className="text-[#872341]">{exportError}</span>}
          <span>•</span>
          <span>Currency: INR (₹)</span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-dialog-title"
            className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#EAE3DC] bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#F4EFEA] px-6 py-4">
              <div>
                <h3
                  id="expense-dialog-title"
                  className="font-editorial text-xl font-bold text-[#1F1E1D]"
                >
                  {editingExpense ? "Edit Expense" : "Record Wedding Expense"}
                </h3>
                <p className="text-xs text-[#8C837A]">
                  Record money already paid. Choose the payment type so advances
                  stay easy to find.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close expense form"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-full p-1 text-[#8C837A] hover:bg-[#FAF7F5] hover:text-[#1F1E1D]"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="space-y-4 overflow-y-auto px-6 py-5"
            >
              {formError && (
                <div className="rounded-xl border border-[#F8D7DA] bg-[#FDF2F4] p-3 text-xs text-[#872341]">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1E1D]">
                  Payment for *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Wedding photographer"
                  className="mt-1 w-full rounded-xl border border-[#EAE3DC] px-3.5 py-2.5 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:outline-none"
                  required
                />
              </div>

              {/* Amount in Rupees */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F1E1D]">
                    Amount paid (₹) *
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute top-2.5 left-3 text-xs font-bold text-[#6D213C]">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formAmountRupees}
                      onChange={(e) => setFormAmountRupees(e.target.value)}
                      placeholder="50000"
                      className="w-full rounded-xl border border-[#EAE3DC] py-2.5 pr-3 pl-7 text-xs font-bold text-[#1F1E1D] focus:border-[#6D213C] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F1E1D]">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#EAE3DC] px-3 py-2 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="expense-payment-kind"
                  className="block text-xs font-semibold text-[#1F1E1D]"
                >
                  Payment type *
                </label>
                <select
                  id="expense-payment-kind"
                  value={formPaymentKind}
                  onChange={(e) =>
                    setFormPaymentKind(e.target.value as ExpensePaymentKind)
                  }
                  className="mt-1 w-full rounded-xl border border-[#EAE3DC] bg-white px-3 py-2.5 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:outline-none"
                >
                  {PAYMENT_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label} — {kind.hint}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] leading-4 text-[#8C837A]">
                  Enter only the amount paid now, not the full agreed cost.
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1E1D]">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) =>
                    setFormCategory(e.target.value as ExpenseCategory)
                  }
                  className="mt-1 w-full rounded-xl border border-[#EAE3DC] px-3 py-2.5 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:outline-none"
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ceremony / Event Link */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1E1D]">
                  Related Ceremony (Optional)
                </label>
                <select
                  value={formEventId}
                  onChange={(e) => setFormEventId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#EAE3DC] px-3 py-2.5 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:outline-none"
                >
                  <option value="">General (All Wedding)</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Details & Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1E1D]">
                  Payment Details &amp; Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Paid via UPI / Bank transfer, Reference #83921, Vendor: Studio Adnan"
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[#EAE3DC] px-3.5 py-2.5 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-[#7A7269] hover:bg-[#FAF7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="cursor-pointer rounded-xl bg-[#6D213C] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#581A30] disabled:opacity-50"
                >
                  {formSubmitting
                    ? "Saving..."
                    : editingExpense
                      ? "Update Expense"
                      : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-[#EAE3DC] bg-white p-6 shadow-2xl">
            <h3 className="font-editorial text-lg font-bold text-[#1F1E1D]">
              Delete Expense?
            </h3>
            <p className="mt-2 text-xs leading-5 text-[#6B645D]">
              Are you sure you want to remove &quot;
              <span className="font-semibold">{deletingExpense.title}</span>
              &quot; ({formatIndianCurrency(deletingExpense.amountRupees)})?
              This transaction will be permanently deleted.
            </p>
            {deleteError && (
              <p className="mt-3 rounded-xl border border-[#F8D7DA] bg-[#FDF2F4] p-3 text-xs text-[#872341]">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                disabled={deleteSubmitting}
                className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-[#7A7269] hover:bg-[#FAF7F5] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="cursor-pointer rounded-xl bg-[#C62828] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#B71C1C] disabled:opacity-50"
              >
                {deleteSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
