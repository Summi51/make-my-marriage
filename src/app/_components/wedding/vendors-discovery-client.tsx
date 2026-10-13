"use client";

import Link from "next/link";
import { useState } from "react";
import { tabFetch } from "@/lib/tab-session";
import { VENDOR_OPTIONS } from "./vendors-page-client";

type Result = {
  googlePlaceId: string;
  name: string;
  rating: number | null;
  ratingCount: number | null;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUri: string;
};

function searchArea(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const first = trimmed.split(",")[0]?.trim() ?? "";
  return first.slice(0, 100);
}

export function VendorsDiscoveryClient({
  initialLocation,
  initialCategory = "PHOTOGRAPHER",
}: {
  initialLocation: string;
  initialCategory?: string;
}) {
  const [category, setCategory] = useState<string>(
    VENDOR_OPTIONS.some(([value]) => value === initialCategory)
      ? initialCategory
      : "PHOTOGRAPHER",
  );
  const [location, setLocation] = useState(searchArea(initialLocation));
  const [results, setResults] = useState<Result[] | null>(null);
  const [provider, setProvider] = useState<"google" | "maps">("maps");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const area = location.trim();
  const mapsSearch = `https://www.google.com/maps/search/${encodeURIComponent(
    `${category.toLowerCase().replace(/_/g, " ")} in ${area || "Delhi"}`,
  )}`;

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setResults(null);
    try {
      const params = new URLSearchParams({
        category,
        query: area.slice(0, 100),
      });
      const response = await tabFetch(`/api/vendor-discovery/search?${params}`);
      const payload = await response.json();
      if (payload.error?.code === "NOT_CONFIGURED") {
        setProvider("maps");
        setResults([]);
        return;
      }
      if (!response.ok)
        throw new Error(payload.error?.message ?? "Search is unavailable.");
      setProvider("google");
      setResults(payload.data as Result[]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Search is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] px-4 pt-7 pb-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/account/wedding/vendors"
          className="text-sm font-medium text-[#7a3450] hover:underline"
        >
          ← Back to My Vendors
        </Link>
        <div className="mt-6 max-w-3xl">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-[#9a735c] uppercase">
            Find your people
          </p>
          <h1 className="mt-2 font-serif text-4xl text-[#2b2025] sm:text-5xl">
            Discover Vendors
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#827773]">
            Explore wedding professionals near your celebration. Your private
            vendor list remains yours to manage.
          </p>
        </div>
        <form
          onSubmit={search}
          className="mt-8 grid gap-4 rounded-2xl border border-[#eadfd7] bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
        >
          <label className="text-sm font-medium text-[#55474c]">
            What do you need?
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#e5d9d3] bg-white px-4 py-3 text-sm outline-none focus:border-[#6d213c]"
            >
              {VENDOR_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[#55474c]">
            City or area
            <input
              required
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Jaipur"
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-[#e5d9d3] px-4 py-3 text-sm outline-none focus:border-[#6d213c]"
            />
          </label>
          <button
            disabled={busy}
            className="rounded-xl bg-[#6d213c] px-6 py-3 text-sm font-semibold text-white hover:bg-[#54172f] disabled:opacity-50"
          >
            {busy ? "Searching..." : "Search vendors"}
          </button>
        </form>
        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-[#f0cbc8] bg-[#fff3f2] p-4 text-sm text-[#9c3030]"
          >
            {error}
          </div>
        )}
        {results !== null && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[#2b2025]">
                  Places to explore
                </h2>
                <p className="mt-1 text-xs text-[#938680]">
                  {provider === "google" ? (
                    <>
                      Results from{" "}
                      <span
                        translate="no"
                        className="font-normal text-[#5e5e5e]"
                      >
                        Google Maps
                      </span>{" "}
                      · Results may change
                    </>
                  ) : (
                    "Live business cards need a paid maps key. The map search below is free."
                  )}
                </p>
              </div>
              {provider === "google" && (
                <p className="text-sm text-[#8b7c79]">
                  {results.length} results
                </p>
              )}
            </div>
            {provider === "maps" ? (
              <div className="mt-5 rounded-2xl border border-[#eadfd7] bg-white p-6 text-sm leading-6 text-[#5c514e]">
                <p>
                  Search for this category in {area || "your city"} on Google
                  Maps. Copy the name, phone, and address of anyone you want to
                  book, then add them yourself. We do not save map results.
                </p>
                <a
                  href={mapsSearch}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-xl bg-[#6d213c] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#54172f]"
                >
                  Open this search in Google Maps ↗
                </a>
              </div>
            ) : results.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-[#eadfd7] bg-white p-10 text-center text-sm text-[#857a75]">
                No results found. Try a nearby city or a different category.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {results.map((result) => (
                  <article
                    key={result.googlePlaceId}
                    className="rounded-2xl border border-[#eadfd7] bg-white p-5 shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5ebeb] font-serif text-xl text-[#6d213c]">
                      {result.name.charAt(0)}
                    </div>
                    <h3 className="mt-4 font-serif text-2xl text-[#2b2025]">
                      {result.name}
                    </h3>
                    {result.rating !== null && (
                      <p className="mt-2 text-sm font-medium text-[#a06e24]">
                        ★ {result.rating.toFixed(1)}{" "}
                        <span className="font-normal text-[#968780]">
                          ({result.ratingCount ?? 0} reviews)
                        </span>
                      </p>
                    )}
                    {result.address && (
                      <p className="mt-2 text-sm leading-5 text-[#7e7370]">
                        {result.address}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-[#eee6e0] pt-4">
                      <a
                        href={result.googleMapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-[#e5d9d3] px-4 py-2 text-xs font-semibold text-[#6d213c]"
                      >
                        View on Google Maps ↗
                      </a>
                      <Link
                        href="/account/wedding/vendors?add=1"
                        className="rounded-xl bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#54172f]"
                      >
                        Add to My Vendors
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Interactive Google Map Explorer */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-[#eadfd7] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#6d213c]"></span>
                <span className="text-[11px] font-semibold tracking-wider text-[#9a735c] uppercase">
                  Google Map Explorer
                </span>
              </div>
              <h2 className="mt-1 font-serif text-2xl text-[#2b2025]">
                {location ? `Exploring ${location}` : "Wedding Venue Perimeter"}
              </h2>
            </div>
            <a
              href={mapsSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5d9d3] bg-white px-4 py-2 text-xs font-semibold text-[#6d213c] hover:bg-[#faf4f6]"
            >
              Open in Google Maps ↗
            </a>
          </div>
          <div className="relative h-72 w-full overflow-hidden rounded-xl border border-[#e8ded7] bg-[#f2ede9]">
            <iframe
              title="Google Map Venue Area"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(`${location || "Delhi"} wedding venues & vendors`)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#e8dcd5] bg-[#fffdfa] p-5 text-sm leading-6 text-[#7c6f6d]">
          Know someone already?{" "}
          <Link
            href="/account/wedding/vendors"
            className="font-semibold text-[#6d213c] underline"
          >
            Add them to My Vendors
          </Link>{" "}
          without using discovery. We do not book or pay vendors on your behalf.
        </div>
      </div>
    </main>
  );
}
