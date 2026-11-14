"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { tabFetch } from "@/lib/tab-session";
import type { VendorDto } from "@/modules/vendors/use-cases";

export const VENDOR_OPTIONS = [
  ["PHOTOGRAPHER", "Photography & Films"],
  ["VIDEOGRAPHER", "Cinematography"],
  ["VENUE", "Royal Venue & Courtyard"],
  ["CATERER", "Catering & Feast"],
  ["DECORATOR", "Florals & Shamiana"],
  ["DJ", "Music, DJ & Qawwali"],
  ["MAKEUP_ARTIST", "Bridal Makeup & Hair"],
  ["MEHENDI_ARTIST", "Henna & Mehndi"],
  ["PANDIT", "Nikah Qazi & Pandit"],
  ["CHOREOGRAPHER", "Sangeet Choreographer"],
  ["FLORIST", "Fresh Florals"],
  ["WEDDING_PLANNER", "Wedding Planner"],
  ["TRANSPORT", "Royal Transport"],
  ["OTHER", "Artisan & Specialist"],
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  PHOTOGRAPHER: "Cinematography & Photo",
  VIDEOGRAPHER: "Films & Video",
  VENUE: "Royal Venue",
  CATERER: "Catering & Feast",
  DECORATOR: "Florals & Decor",
  DJ: "Qawwali & Music",
  MAKEUP_ARTIST: "Bridal Makeup",
  MEHENDI_ARTIST: "Henna & Mehndi",
  PANDIT: "Qazi & Rituals",
  CHOREOGRAPHER: "Choreography",
  FLORIST: "Fresh Florals",
  WEDDING_PLANNER: "Wedding Planner",
  TRANSPORT: "Transport",
  OTHER: "Specialist Artisan",
};

type VendorForm = {
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  meetingUrl: string;
  costRupees: string;
  eventIds: string[];
  notes: string;
};

const blank: VendorForm = {
  name: "",
  category: "CATERER",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  meetingUrl: "",
  costRupees: "",
  eventIds: [],
  notes: "",
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#e8dfd7] bg-white px-4 py-3 text-sm text-[#2a2225] outline-none transition focus:border-[#6d213c] focus:ring-2 focus:ring-[#6d213c]/10";
const labelClass = "block text-sm font-medium text-[#51434a]";

export function VendorsPageClient({
  initialVendors,
  events,
  location: initialLocation,
  weddingTitle = "your wedding",
  openAdd,
}: {
  initialVendors: VendorDto[];
  initialTotal?: number;
  events: { id: string; name: string }[];
  location: string;
  weddingTitle?: string;
  openAdd: boolean;
}) {
  const [vendors, setVendors] = useState(initialVendors);
  const [location, setLocation] = useState(initialLocation);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<VendorDto | "new" | null>(
    openAdd ? "new" : null,
  );
  const [form, setForm] = useState<VendorForm>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("add") !== "1") return;
    url.searchParams.delete("add");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        includeArchived: String(showArchived),
      });
      try {
        const response = await tabFetch(`/api/vendors?${params}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error?.message ?? "Could not load vendors.");
        setVendors(body.data as VendorDto[]);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Could not load vendors.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [showArchived, refreshCounter]);

  // Client-side quick filter for fast response
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      if (!showArchived && vendor.archivedAt) return false;
      if (selectedCategory !== "ALL" && vendor.category !== selectedCategory)
        return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        vendor.name.toLowerCase().includes(q) ||
        (vendor.contactPerson &&
          vendor.contactPerson.toLowerCase().includes(q)) ||
        (vendor.address && vendor.address.toLowerCase().includes(q)) ||
        (vendor.notes && vendor.notes.toLowerCase().includes(q))
      );
    });
  }, [vendors, showArchived, selectedCategory, query]);

  const activeVendors = useMemo(
    () => vendors.filter((vendor) => !vendor.archivedAt),
    [vendors],
  );
  const pricedVendors = activeVendors.filter(
    (vendor) => vendor.totalAgreedCostPaise != null,
  );
  const totalCommittedRupees = Math.round(
    pricedVendors.reduce(
      (sum, vendor) => sum + (vendor.totalAgreedCostPaise ?? 0),
      0,
    ) / 100,
  );
  const categoryCount = new Set(activeVendors.map((vendor) => vendor.category))
    .size;

  const eventsCount = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => {
      if (!v.archivedAt) v.eventIds.forEach((id) => set.add(id));
    });
    return set.size;
  }, [vendors]);

  // Export Contacts to CSV
  function exportContacts() {
    const headers = [
      "Vendor Name",
      "Category",
      "Contact Person",
      "Phone",
      "Email",
      "Address",
      "Website",
      "Meeting link",
      "Total Agreed Cost (INR)",
      "Notes",
    ];
    const cell = (value: string) => {
      const stripped = value.replace(/^[\s"]+/, "");
      const safe = /^[=+\-@]/.test(stripped) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = vendors.map((v) => [
      cell(v.name || ""),
      cell(CATEGORY_LABELS[v.category] || v.category),
      cell(v.contactPerson || ""),
      cell(v.phone || ""),
      cell(v.email || ""),
      cell(v.address || ""),
      cell(v.website || ""),
      cell(v.meetingUrl || ""),
      v.totalAgreedCostPaise != null
        ? (v.totalAgreedCostPaise / 100).toFixed(2)
        : "",
      cell(v.notes || ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wedding-vendors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openForm(vendor?: VendorDto) {
    setError("");
    setNotice("");
    setEditing(vendor ?? "new");
    setForm(
      vendor
        ? {
            name: vendor.name,
            category: vendor.category,
            contactPerson: vendor.contactPerson ?? "",
            phone: vendor.phone ?? "",
            email: vendor.email ?? "",
            address: vendor.address ?? "",
            website: vendor.website ?? "",
            meetingUrl: vendor.meetingUrl ?? "",
            costRupees:
              vendor.totalAgreedCostPaise == null
                ? ""
                : String(vendor.totalAgreedCostPaise / 100),
            eventIds: vendor.eventIds,
            notes: vendor.notes ?? "",
          }
        : blank,
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError("");
    const cost = form.costRupees.trim();
    const parsedCost = cost ? Number(cost) : null;
    if (
      parsedCost !== null &&
      (!/^\d+(\.\d{1,2})?$/.test(cost) ||
        !Number.isFinite(parsedCost) ||
        parsedCost < 0)
    ) {
      setError("Enter a valid cost with at most two decimal places.");
      setBusy(false);
      return;
    }
    try {
      const response = await tabFetch(
        editing === "new" ? "/api/vendors" : `/api/vendors/${editing.id}`,
        {
          method: editing === "new" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category,
            contactPerson: form.contactPerson.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            address: form.address.trim() || null,
            website: form.website.trim() || null,
            meetingUrl: form.meetingUrl.trim() || null,
            totalAgreedCostPaise:
              parsedCost === null ? null : Math.round(parsedCost * 100),
            eventIds: form.eventIds,
            notes: form.notes.trim() || null,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message ?? "Could not save vendor.");
      const saved = payload.data as VendorDto;
      setVendors((current) =>
        editing === "new"
          ? [saved, ...current]
          : current.map((vendor) => (vendor.id === saved.id ? saved : vendor)),
      );
      setRefreshCounter((current) => current + 1);
      setNotice(
        editing === "new"
          ? `"${saved.name}" added to your wedding team.`
          : `"${saved.name}" details updated.`,
      );
      setEditing(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save vendor.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archive(vendor: VendorDto) {
    if (
      !window.confirm(
        `Archive "${vendor.name}"? Their record will be archived safely.`,
      )
    )
      return;
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await tabFetch(`/api/vendors/${vendor.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Could not archive vendor.");
      }
      setVendors((current) =>
        current.map((item) =>
          item.id === vendor.id
            ? { ...item, archivedAt: new Date().toISOString() }
            : item,
        ),
      );
      setRefreshCounter((current) => current + 1);
      setNotice(`"${vendor.name}" was archived.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not archive vendor.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function restore(vendor: VendorDto) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await tabFetch(`/api/vendors/${vendor.id}/restore`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message ?? "Could not restore vendor.");
      const saved = payload.data as VendorDto;
      setVendors((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setRefreshCounter((current) => current + 1);
      setNotice(`"${saved.name}" is active again.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not restore vendor.",
      );
    } finally {
      setBusy(false);
    }
  }

  const categoryPillCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: vendors.length };
    vendors.forEach((v) => {
      counts[v.category] = (counts[v.category] || 0) + 1;
    });
    return counts;
  }, [vendors]);

  return (
    <main className="min-h-screen bg-[#faf8f5] px-4 pt-6 pb-20 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Top Header Section */}
        <header className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#6d213c]"></span>
                <span className="text-[11px] font-semibold tracking-widest text-[#857276] uppercase">
                  Wedding Vendors &amp; Artisans • {weddingTitle}
                </span>
              </div>
              <h1 className="font-editorial text-4xl tracking-tight text-[#6d213c] sm:text-5xl">
                My Vendors
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[#736368]">
                Keep the artisans you booked, their agreed costs, and their
                contacts in one place for {weddingTitle}.
              </p>
            </div>

            {/* Action Ribbon */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={exportContacts}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5d8d3] bg-white px-4 py-2.5 text-sm font-semibold text-[#51434a] shadow-xs transition-colors hover:bg-[#f7f0f2]"
              >
                <svg
                  className="h-4 w-4 text-[#865045]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Export Contacts</span>
              </button>

              <Link
                href="/account/wedding/vendors/discover"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5d8d3] bg-white px-4 py-2.5 text-sm font-semibold text-[#6d213c] shadow-xs transition-colors hover:bg-[#f7f0f2]"
              >
                <svg
                  className="h-4 w-4 text-[#6d213c]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Find Nearby Vendors</span>
              </Link>

              <button
                type="button"
                onClick={() => openForm()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d213c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#54172f]"
              >
                <span>+ Add Booked Vendor</span>
              </button>
            </div>
          </div>

          {/* Financial & Contract Metrics Bento Bar */}
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#ece4df] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8b797e] uppercase">
                  Total Artisans
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fdeee9] text-[#865045]">
                  <span className="text-sm">✓</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-editorial text-3xl text-[#6d213c]">
                  {activeVendors.length} Booked
                </div>
                <p className="mt-1 text-xs text-[#8b797e]">
                  {eventsCount === 0
                    ? "No ceremonies assigned yet"
                    : `Linked to ${eventsCount} ceremonies`}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#ece4df] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8b797e] uppercase">
                  Committed Budget
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4ebe6] text-[#554a43]">
                  <span className="text-sm">₹</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-editorial text-3xl text-[#2b2025]">
                  ₹{totalCommittedRupees.toLocaleString("en-IN")}
                </div>
                <p className="mt-1 text-xs text-[#8b797e]">
                  Total contract value
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#ece4df] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8b797e] uppercase">
                  Costs recorded
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4ebe6] text-[#554a43]">
                  <span className="text-sm">#</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-editorial text-3xl text-[#6d213c]">
                  {pricedVendors.length}
                </div>
                <p className="mt-1 text-xs text-[#8b797e]">
                  Vendors with an agreed cost
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#ece4df] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8b797e] uppercase">
                  Categories
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe8e6] text-[#9c3030]">
                  <span className="text-xs font-bold">•</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-editorial text-3xl text-[#865045]">
                  {categoryCount}
                </div>
                <p className="mt-1 text-xs text-[#8b797e]">
                  Paid amounts stay on Expenses
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Notices and Alerts */}
        {notice && (
          <div
            role="status"
            className="mt-6 flex items-center justify-between rounded-xl border border-[#d8e9df] bg-[#f0f8f2] px-4 py-3 text-sm text-[#28593b]"
          >
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              className="text-xs font-bold text-[#28593b] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}
        {error && !editing && (
          <div
            role="alert"
            className="mt-6 flex items-center justify-between rounded-xl border border-[#f2c7c7] bg-[#fff4f4] px-4 py-3 text-sm text-[#9c3030]"
          >
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-xs font-bold text-[#9c3030] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Location Intelligence & Quick Search */}
        <div className="mt-6 flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-[#ece4df] bg-white p-4 shadow-xs sm:p-5 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex max-w-full min-w-0 items-center gap-2.5 rounded-xl border border-[#f0e7e4] bg-[#faf4f2] px-3.5 py-2">
              <span className="text-lg text-[#6d213c]">📍</span>
              <div className="flex min-w-0 flex-col">
                <span className="text-[10px] font-semibold tracking-wider text-[#8b797e] uppercase">
                  Search city
                </span>
                <span
                  title={location || "Your wedding city"}
                  className="max-w-[220px] truncate text-xs font-semibold text-[#2b2025] sm:max-w-[280px]"
                >
                  {location || "Your wedding city"}
                </span>
              </div>
            </div>

            {isEditingLocation ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter city or area..."
                  className="rounded-lg border border-[#e5d8d3] bg-white px-3 py-1.5 text-xs outline-none focus:border-[#6d213c]"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingLocation(false)}
                  className="rounded-lg bg-[#6d213c] px-3 py-1.5 text-xs font-medium text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingLocation(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#f7f2ef] px-3 py-2 text-xs font-medium text-[#2b2025] transition-colors hover:bg-[#ede5e0]"
              >
                <span>✏️ Change search city</span>
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative max-w-md flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by vendor name, category, or service area..."
              className="w-full rounded-xl border border-transparent bg-[#faf4f2] py-2.5 pr-4 pl-9 text-xs text-[#2b2025] transition-all outline-none placeholder:text-[#8b797e] focus:border-[#6d213c] focus:bg-white"
            />
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#8b797e]">
              🔍
            </span>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[#8b797e] hover:text-[#2b2025]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Category Badges */}
        <div className="mt-5 flex scrollbar-none items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap shadow-xs transition-colors ${
              selectedCategory === "ALL"
                ? "bg-[#6d213c] text-white"
                : "border border-[#ece4df] bg-white text-[#51434a] hover:bg-[#f7f2ef]"
            }`}
          >
            All Vendors ({categoryPillCounts.ALL || 0})
          </button>
          {VENDOR_OPTIONS.map(([val, label]) => {
            const count = categoryPillCounts[val] || 0;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setSelectedCategory(val)}
                className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap shadow-xs transition-colors ${
                  selectedCategory === val
                    ? "bg-[#6d213c] text-white"
                    : "border border-[#ece4df] bg-white text-[#51434a] hover:bg-[#f7f2ef]"
                }`}
              >
                {label} {count > 0 ? `(${count})` : ""}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`ml-auto rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap shadow-xs transition-colors ${
              showArchived
                ? "border-[#865045] bg-[#865045] text-white"
                : "border-[#ece4df] bg-white text-[#865045] hover:bg-[#faf4f2]"
            }`}
          >
            {showArchived ? "Archived included" : "Show archived"}
          </button>
        </div>

        {/* Interactive Google Location Map Discovery Banner */}
        <section className="relative mt-6 flex flex-col items-stretch gap-6 overflow-hidden rounded-2xl border border-[#ece4df] bg-white p-5 shadow-xs sm:p-6 xl:flex-row">
          {/* Left Editorial Dispatch */}
          <div className="flex max-w-sm shrink-0 flex-col justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex items-center gap-1.5 text-[#865045]">
                <span className="text-sm">🧭</span>
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  Geographic Dispatch
                </span>
              </div>
              <h2 className="font-editorial text-2xl text-[#6d213c]">
                Vendors near {location || "your celebration"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#736368]">
                Open a category search for your city. Copy a name, phone, and
                address yourself. Map results are not saved or verified.
              </p>
            </div>

            {/* Fast Route Match Pills */}
            <div className="flex flex-col gap-2 pt-4">
              <span className="text-[10px] font-semibold tracking-wider text-[#9a868a] uppercase">
                Fast Route Match
              </span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/account/wedding/vendors/discover?category=CATERER"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#f0e7e4] bg-[#faf4f2] px-3 py-1.5 text-xs font-medium text-[#2b2025] transition-colors hover:bg-[#f2e6e3]"
                >
                  <span>🍽️ Caterers nearby</span>
                </Link>
                <Link
                  href="/account/wedding/vendors/discover?category=MEHENDI_ARTIST"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#f0e7e4] bg-[#faf4f2] px-3 py-1.5 text-xs font-medium text-[#2b2025] transition-colors hover:bg-[#f2e6e3]"
                >
                  <span>✨ Mehndi Artists near Venue</span>
                </Link>
                <Link
                  href="/account/wedding/vendors/discover?category=DJ"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#f0e7e4] bg-[#faf4f2] px-3 py-1.5 text-xs font-medium text-[#2b2025] transition-colors hover:bg-[#f2e6e3]"
                >
                  <span>🎵 DJs &amp; Qawwals Available</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Interactive Google Map Container */}
          <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-xl border border-[#e8ded7] bg-[#f2ede9] shadow-inner">
            {/* Embedded Live Google Map */}
            <iframe
              title="Google Map Venue Explorer"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 280 }}
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                `${location || "Delhi"} wedding vendors`,
              )}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </section>

        {/* Booked Vendors Roster (Engaged Master Artisans Grid) */}
        <section className="mt-10 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-editorial flex items-center gap-2 text-2xl text-[#6d213c] sm:text-3xl">
                <span>Engaged Master Artisans</span>
                {loading && (
                  <span className="animate-pulse font-sans text-xs font-normal text-[#8b797e]">
                    updating…
                  </span>
                )}
              </h2>
              <p className="mt-0.5 text-xs text-[#736368]">
                Agreed costs and contacts you recorded. Paid amounts stay on
                Expenses.
              </p>
            </div>
          </div>

          {/* Grid of Cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredVendors.map((vendor) => {
              const totalCostRupees =
                vendor.totalAgreedCostPaise == null
                  ? null
                  : Math.round(vendor.totalAgreedCostPaise / 100);
              const isArchived = Boolean(vendor.archivedAt);

              const assignedEvents = events
                .filter((e) => vendor.eventIds.includes(e.id))
                .map((e) => e.name)
                .join(", ");

              return (
                <article
                  key={vendor.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#ece4df] bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                    isArchived ? "bg-[#fbf9f8] opacity-75" : ""
                  }`}
                >
                  <div className="flex flex-col gap-4">
                    {/* Header & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-[#fdeee9] px-2.5 py-1 text-[11px] font-semibold text-[#865045]">
                        {CATEGORY_LABELS[vendor.category] || vendor.category}
                      </span>
                      {isArchived && (
                        <span className="rounded-md border border-[#e5d8d3] bg-[#faf4f2] px-2 py-0.5 text-[11px] font-semibold text-[#865045]">
                          Archived
                        </span>
                      )}
                    </div>

                    {/* Title & Location */}
                    <div>
                      <h3 className="font-editorial text-xl text-[#2b2025] transition-colors group-hover:text-[#6d213c]">
                        {vendor.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-xs text-[#736368]">
                        <span>📍</span>
                        <span className="truncate">
                          {vendor.address || "Address not recorded"}
                        </span>
                      </div>
                    </div>

                    {/* Event Link & Contact Specs Box */}
                    <div className="flex flex-col gap-2 rounded-xl border border-[#f2e7e4] bg-[#faf4f2] p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#8b797e]">
                          Assigned Event
                        </span>
                        <span className="max-w-[170px] truncate font-semibold text-[#2b2025]">
                          {assignedEvents || "Not assigned"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#8b797e]">Lead</span>
                        <span className="max-w-[170px] truncate text-[#2b2025]">
                          {vendor.contactPerson
                            ? `${vendor.contactPerson} ${vendor.phone ? `(${vendor.phone})` : ""}`
                            : vendor.phone || "Not recorded"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#eee2de] pt-1 text-xs">
                        <span className="font-medium text-[#8b797e]">
                          Status
                        </span>
                        <span className="max-w-[170px] truncate font-semibold text-[#6d213c]">
                          {isArchived
                            ? "Archived"
                            : vendor.notes
                              ? "Notes saved"
                              : "Active"}
                        </span>
                      </div>
                    </div>

                    {totalCostRupees != null && (
                      <p className="text-xs text-[#736368]">
                        Agreed cost{" "}
                        <span className="font-semibold text-[#2b2025]">
                          ₹{totalCostRupees.toLocaleString("en-IN")}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 flex items-center gap-2 border-t border-[#f2ece9] pt-3">
                    {isArchived ? (
                      <button
                        type="button"
                        onClick={() => restore(vendor)}
                        disabled={busy}
                        className="flex-1 rounded-xl bg-[#6d213c] px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-[#54172f] disabled:opacity-50"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openForm(vendor)}
                        className="flex-1 rounded-xl bg-[#faf4f2] px-3 py-2 text-center text-xs font-semibold text-[#2b2025] transition-colors hover:bg-[#6d213c] hover:text-white"
                      >
                        View Details &amp; Edit
                      </button>
                    )}
                    {vendor.phone && (
                      <a
                        href={`tel:${vendor.phone.replace(/\s/g, "")}`}
                        title={`Call ${vendor.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#faf4f2] text-[#2b2025] transition-colors hover:bg-[#f2e6e3] hover:text-[#6d213c]"
                      >
                        📞
                      </a>
                    )}
                    {vendor.email && (
                      <a
                        href={`mailto:${vendor.email}`}
                        title={`Email ${vendor.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#faf4f2] text-[#2b2025] transition-colors hover:bg-[#f2e6e3] hover:text-[#6d213c]"
                      >
                        ✉
                      </a>
                    )}
                    {vendor.website && (
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Website"
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#faf4f2] text-[#2b2025] transition-colors hover:bg-[#f2e6e3] hover:text-[#6d213c]"
                      >
                        ↗
                      </a>
                    )}
                    {vendor.meetingUrl && (
                      <a
                        href={vendor.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open saved meeting link"
                        aria-label="Open saved meeting link"
                        className="flex h-8 items-center justify-center rounded-xl bg-[#faf4f2] px-2 text-xs font-semibold text-[#2b2025] transition-colors hover:bg-[#f2e6e3] hover:text-[#6d213c]"
                      >
                        Meet
                      </a>
                    )}
                    {!isArchived && (
                      <button
                        type="button"
                        onClick={() => archive(vendor)}
                        disabled={busy}
                        title="Archive vendor"
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#faf4f2] text-[#8b797e] transition-colors hover:bg-[#feecec] hover:text-[#ba1a1a]"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Connect Another Vendor (Dashed Card) */}
            <div
              onClick={() => openForm()}
              className="group flex min-h-[340px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#e2d5cf] p-6 text-center transition-all hover:border-[#6d213c] hover:bg-white/60"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#faf4f2] text-[#6d213c] transition-colors group-hover:bg-[#6d213c] group-hover:text-white">
                <span className="text-2xl font-bold">+</span>
              </div>
              <div className="flex max-w-xs flex-col gap-1">
                <h4 className="font-editorial text-xl text-[#2b2025] transition-colors group-hover:text-[#6d213c]">
                  Connect Another Vendor
                </h4>
                <p className="text-xs leading-relaxed text-[#736368]">
                  Seamlessly record contract deposits, attach agreements, or
                  locate verified bridal services.
                </p>
              </div>
              <span className="mt-1 text-xs font-semibold text-[#6d213c] group-hover:underline">
                Add to Roster →
              </span>
            </div>
          </div>
        </section>

        {/* Essential Milestone Ceremony Check Banner */}
        <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#6d213c] p-6 text-white shadow-sm sm:p-7 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">
              📖
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-[#feb8aa] uppercase">
                Essential Milestone Ceremony Check
              </span>
              <h3 className="font-editorial mt-0.5 text-2xl font-normal">
                Nikah Qazi &amp; Pandit Ceremony Specialist
              </h3>
              <p className="mt-1 max-w-xl text-xs text-white/80">
                Have you confirmed your certified wedding officiant, Nikahnama
                calligrapher, or ritual priest for your celebratory ceremonies?
              </p>
            </div>
          </div>
          <Link
            href="/account/wedding/vendors/discover?category=PANDIT"
            className="rounded-xl bg-white px-5 py-3 text-xs font-bold whitespace-nowrap text-[#6d213c] shadow-xs transition-colors hover:bg-[#faf4f2]"
          >
            Browse Specialists Nearby
          </Link>
        </div>
      </div>

      {/* Add / Edit Vendor Modal */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#ece4df] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-[#865045] uppercase">
                  {editing === "new" ? "New Partnership" : "Edit Vendor"}
                </p>
                <h2 className="font-editorial mt-1 text-2xl text-[#6d213c] sm:text-3xl">
                  {editing === "new" ? "Book an Artisan" : form.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full p-2 text-[#8b797e] hover:bg-[#faf4f2] hover:text-[#2b2025]"
              >
                ✕
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-[#f2c7c7] bg-[#fff4f4] px-4 py-3 text-xs text-[#9c3030]"
              >
                {error}
              </div>
            )}

            <form onSubmit={save} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Vendor or Business Name *
                    <input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Al-Bait Royal Catering"
                      maxLength={120}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <div>
                  <label className={labelClass}>
                    Service Category *
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      className={fieldClass}
                    >
                      {VENDOR_OPTIONS.map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Contact Person
                    <input
                      value={form.contactPerson}
                      onChange={(e) =>
                        setForm({ ...form, contactPerson: e.target.value })
                      }
                      placeholder="e.g. Farhan Zaidi"
                      maxLength={120}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <div>
                  <label className={labelClass}>
                    Phone Number
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="e.g. +91 98765 43210"
                      maxLength={40}
                      className={fieldClass}
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Email Address
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="e.g. info@vendor.com"
                      maxLength={254}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <div>
                  <label className={labelClass}>
                    Website / Portfolio
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) =>
                        setForm({ ...form, website: e.target.value })
                      }
                      placeholder="https://..."
                      maxLength={500}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <div>
                  <label className={labelClass}>
                    Audio / video meeting link
                    <input
                      type="url"
                      value={form.meetingUrl}
                      onChange={(e) =>
                        setForm({ ...form, meetingUrl: e.target.value })
                      }
                      placeholder="https://meet.google.com/..."
                      maxLength={500}
                      className={fieldClass}
                    />
                    <span className="mt-1 block text-xs text-[#8b797e]">
                      Paste a free Google Meet, WhatsApp, or other meeting link.
                      This opens that link. It does not start a paid call.
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Total Agreed Cost (₹ INR)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.costRupees}
                      onChange={(e) =>
                        setForm({ ...form, costRupees: e.target.value })
                      }
                      placeholder="e.g. 250000"
                      className={fieldClass}
                    />
                  </label>
                </div>
                <div>
                  <label className={labelClass}>
                    Location / Venue Address
                    <input
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      placeholder="e.g. Civil Lines, Delhi"
                      maxLength={500}
                      className={fieldClass}
                    />
                  </label>
                </div>
              </div>

              {/* Event Associations */}
              {events.length > 0 && (
                <div>
                  <label className={labelClass}>
                    Assigned Celebrations
                    <div className="mt-2 flex flex-wrap gap-2">
                      {events.map((ev) => {
                        const checked = form.eventIds.includes(ev.id);
                        return (
                          <button
                            type="button"
                            key={ev.id}
                            onClick={() => {
                              setForm({
                                ...form,
                                eventIds: checked
                                  ? form.eventIds.filter((id) => id !== ev.id)
                                  : [...form.eventIds, ev.id],
                              });
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              checked
                                ? "border-[#6d213c] bg-[#6d213c] text-white"
                                : "border-[#e5d8d3] bg-white text-[#51434a] hover:bg-[#faf4f2]"
                            }`}
                          >
                            {checked ? "✓ " : "+ "}
                            {ev.name}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                </div>
              )}

              {/* Notes / Contract Details */}
              <div>
                <label className={labelClass}>
                  Scope, Menu, or Contract Notes
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="e.g. Menu Sealed (Mutton Degs + Live BBQ), Stage Decor in Peach & Champagne..."
                    maxLength={2000}
                    className={fieldClass}
                  />
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-[#f2ece9] pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-xl border border-[#e5d8d3] px-5 py-2.5 text-xs font-semibold text-[#51434a] hover:bg-[#faf4f2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#6d213c] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#54172f] disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save Artisan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
