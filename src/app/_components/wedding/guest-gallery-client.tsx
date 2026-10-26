"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandWordmark } from "@/app/_components/homepage/logo";
import {
  MAX_PHOTO_BYTES,
  MAX_BATCH,
  photoMimeTypes,
} from "@/modules/photos/schemas";
type Info = {
  wedding: { brideName: string; groomName: string; weddingDate: string };
  guestUploadsEnabled: boolean;
  events: { id: string; name: string }[];
};
type Photo = { id: string; url: string; filename: string | null };
async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    referrerPolicy: "no-referrer",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "Please try again.");
  return body;
}
export function GuestGalleryClient({ token }: { token: string }) {
  const base = `/api/public/galleries/${encodeURIComponent(token)}`;
  const [info, setInfo] = useState<Info | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [event, setEvent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const details = await json(base);
      setInfo(details.data);
      const album = await json(`${base}/photos`);
      setPhotos(album.data);
      setCursor(album.pagination.nextCursor);
      setError("");
    } catch (e) {
      setInfo(null);
      setPhotos([]);
      setError(e instanceof Error ? e.message : "Could not load the album.");
    } finally {
      setLoading(false);
    }
  }, [base]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);
  async function upload() {
    setBusy(true);
    setError("");
    setNotice("");
    const remaining: File[] = [];
    let count = 0;
    for (const file of files) {
      try {
        const metadata = {
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          eventId: event || null,
        };
        const reserved = await json(`${base}/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        });
        let sent: Response | null = null;
        try {
          sent = await fetch(reserved.data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
            referrerPolicy: "no-referrer",
          });
        } catch {
          /* Use a bounded same-origin upload if CORS blocks R2. */
        }
        if (!sent?.ok)
          await json(
            `${base}/upload-fallback?objectKey=${encodeURIComponent(reserved.data.objectKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/octet-stream" },
              body: file,
            },
          );
        await json(`${base}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...metadata,
            objectKey: reserved.data.objectKey,
          }),
        });
        count++;
      } catch (e) {
        remaining.push(file);
        setError(
          e instanceof Error ? e.message : "Upload failed. Please retry.",
        );
      }
    }
    setFiles(remaining);
    if (input.current && remaining.length === 0) input.current.value = "";
    if (count > 0)
      setNotice(
        `${count} photo${count === 1 ? "" : "s"} added. Thank you for sharing!`,
      );
    try {
      const album = await json(`${base}/photos`);
      setPhotos(album.data);
      setCursor(album.pagination.nextCursor);
    } catch {
      /* Preserve upload feedback. */
    }
    setBusy(false);
  }
  return (
    <main className="min-h-screen bg-[#faf8f5] px-5 py-10 text-[#2c1820] sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col items-center text-center">
          <BrandWordmark size="compact" className="mb-4" />
          <h1 className="mt-2 font-serif text-4xl text-[#6d213c] sm:text-6xl">
            {info
              ? `${info.wedding.brideName} & ${info.wedding.groomName}`
              : "Wedding photo album"}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#735d65]">
            The moments we lived. The moments you captured. Keep our celebration
            together in one private album.
          </p>
        </header>
        {error && (
          <p
            role="alert"
            className="my-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="my-6 rounded-xl bg-green-50 p-4 text-sm text-green-800"
          >
            {notice}
          </p>
        )}
        <div className="my-8 flex justify-end">
          <button
            disabled={busy || loading}
            onClick={() => void refresh()}
            className="rounded-xl border border-[#e5d8d3] bg-white px-5 py-3 text-sm hover:bg-[#f4ece3] disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh album"}
          </button>
        </div>
        {info && (
          <>
            {info.guestUploadsEnabled ? (
              <section className="mb-10 rounded-3xl border border-[#e5d8d3] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="font-serif text-3xl">
                  Add your favourite moments
                </h2>
                <p className="mt-2 text-sm text-[#735d65]">
                  JPEG, PNG or WebP · Up to 4 MB each · 20 photos per batch
                </p>
                <label className="mt-6 block text-sm font-semibold">
                  Celebration (optional)
                  <select
                    disabled={busy}
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    className="mt-2 block w-full rounded-xl border border-[#e5d8d3] bg-white p-3"
                  >
                    <option value="">Other / Wedding memories</option>
                    {info.events.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-5 block rounded-2xl border-2 border-dashed border-[#e5d8d3] bg-[#faf8f5] p-6 text-sm">
                  Choose photos
                  <input
                    ref={input}
                    aria-label="Choose photos"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    className="mt-3 block max-w-full"
                    onChange={(e) => {
                      const selected = Array.from(e.target.files || []);
                      if (
                        selected.length > MAX_BATCH ||
                        selected.some(
                          (file) =>
                            file.size < 1 ||
                            file.size > MAX_PHOTO_BYTES ||
                            !photoMimeTypes.includes(
                              file.type as (typeof photoMimeTypes)[number],
                            ),
                        )
                      ) {
                        setError(
                          "Choose up to 20 JPEG, PNG or WebP photos, each between 1 byte and 4 MB.",
                        );
                        setFiles([]);
                        e.target.value = "";
                        return;
                      }
                      setError("");
                      setFiles(selected);
                    }}
                  />
                </label>
                <ul className="mt-3 space-y-1 text-xs text-[#735d65]">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="break-all">
                      {file.name}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={busy || !files.length}
                  onClick={() => void upload()}
                  className="mt-5 rounded-xl bg-[#6d213c] px-6 py-3 text-sm font-semibold text-white hover:bg-[#521427] disabled:opacity-50"
                >
                  {busy
                    ? "Uploading…"
                    : `Upload ${files.length || "your"} photos`}
                </button>
                <p className="mt-3 text-xs leading-5 text-[#937c6e]">
                  Share only photos you have permission to share. Everyone with
                  this private link can view them. Wedding members can remove
                  photos.
                </p>
              </section>
            ) : (
              <p className="mb-8 rounded-xl bg-white p-5 text-sm">
                Uploads are paused. Enjoy the memories already shared below.
              </p>
            )}
            <h2 className="mb-5 font-serif text-3xl">
              The celebration, through your eyes
            </h2>
            {photos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e5d8d3] p-10 text-center text-[#735d65]">
                No photos yet. Be the first to share a memory.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg"
                  >
                    <img
                      src={photo.url}
                      referrerPolicy="no-referrer"
                      alt={photo.filename || "Wedding memory"}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
            {cursor && (
              <button
                disabled={loading}
                className="mx-auto mt-6 block rounded-xl border border-[#e5d8d3] px-6 py-3"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await json(
                      `${base}/photos?cursor=${encodeURIComponent(cursor)}`,
                    );
                    setPhotos((previous) => [...previous, ...result.data]);
                    setCursor(result.pagination.nextCursor);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Could not load more photos.",
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Load more memories
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
