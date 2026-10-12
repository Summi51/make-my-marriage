"use client";

import { useEffect, useId, useRef, useState } from "react";
import { tabFetch } from "@/lib/tab-session";

interface GalleryPhoto {
  id: string;
  title: string;
  category: string;
  filename: string;
  sizeBytes: number;
  categoryLabel: string;
  imageUrl: string;
  location?: string;
  curator?: string;
  photographer?: string;
  badge?: string;
  fileSize?: string;
  dimensions?: string;
  dateLabel?: string;
  span?: "full" | "half" | "normal";
  isCover?: boolean;
}

interface QueuedItem {
  id: string;
  name: string;
  sizeMb: number;
  status: "needs_attention" | "validated" | "uploaded" | "uploading";
  progress?: number;
  previewUrl?: string;
  errorMessage?: string;
  retryable?: boolean;
}

function categoryFor(
  eventId: string | null | undefined,
  events: GalleryPageClientProps["events"],
): GalleryPhoto["category"] {
  void events;
  return eventId || "other";
}

function labelFor(
  eventId: string | null | undefined,
  events: GalleryPageClientProps["events"],
) {
  return (
    events.find((event) => event.id === eventId)?.name ?? "Wedding Memories"
  );
}

interface GalleryPageClientProps {
  wedding: {
    id: string;
    title: string;
    brideName: string;
    groomName: string;
    weddingDate: string | null;
  };
  events: Array<{
    id: string;
    name: string;
    type?: string | null;
    startsAt: string | null;
    venueName?: string | null;
  }>;
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_BATCH = 20;

export function GalleryPageClient({ wedding, events }: GalleryPageClientProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [albumTotal, setAlbumTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isDownloading, setIsDownloading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const refreshVersion = useRef(0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("other");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputId = useId();
  const filesRef = useRef<Map<string, File>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toGalleryPhoto = (photo: {
    id: string;
    originalFilename?: string | null;
    eventId?: string | null;
    url: string;
    sizeBytes?: number;
    createdAt?: string | null;
  }): GalleryPhoto => ({
    id: photo.id,
    filename: photo.originalFilename || "photo",
    sizeBytes: photo.sizeBytes ?? 0,
    title: (photo.originalFilename || "Photo").replace(/\.[^/.]+$/, ""),
    category: categoryFor(photo.eventId, events),
    categoryLabel: labelFor(photo.eventId, events),
    imageUrl: photo.url,
    fileSize: photo.sizeBytes
      ? `${(photo.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : undefined,
    dateLabel: photo.createdAt
      ? new Date(photo.createdAt).toLocaleDateString()
      : undefined,
    span: "normal",
  });

  const fetchPhotoPage = async (album: string, cursor: string | null) => {
    const params = new URLSearchParams({ limit: "24" });
    if (album !== "all") params.set("eventId", album);
    if (cursor) params.set("cursor", cursor);
    const response = await tabFetch(`/api/photos?${params}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error();
    const json = await response.json();
    return {
      page: (json.data ?? []).map(toGalleryPhoto) as GalleryPhoto[],
      nextCursor: (json.pagination?.nextCursor ?? null) as string | null,
      total: (json.pagination?.total ?? 0) as number,
    };
  };

  const loadPhotos = async (
    album = activeTab,
    cursor: string | null = null,
  ) => {
    const version = ++refreshVersion.current;
    if (cursor) setIsLoadingMore(true);
    else setIsRefreshing(true);
    setLoadError(false);
    try {
      const loaded = await fetchPhotoPage(album, cursor);
      if (version !== refreshVersion.current) return;
      const page = loaded.page;
      setPhotos((current) => {
        const next = cursor ? [...current, ...page] : page;
        setLightboxPhoto((open) =>
          open ? (next.find((photo) => photo.id === open.id) ?? null) : null,
        );
        return next;
      });
      setNextCursor(loaded.nextCursor);
      setAlbumTotal(loaded.total || page.length);
    } catch {
      if (version === refreshVersion.current) setLoadError(true);
    } finally {
      if (version === refreshVersion.current) {
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (filesRef.current.size > 0) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    // The first page comes from this wedding's private gallery, not from render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPhotos("all");
    return () => window.removeEventListener("beforeunload", warn);
    // Gallery loads the first page once for this signed-in wedding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFavorite = (photoId: string) => {
    setFavorites((prev) => ({
      ...prev,
      [photoId]: !prev[photoId],
    }));
  };

  const filteredPhotos =
    activeTab === "all"
      ? photos
      : photos.filter((p) => p.category === activeTab);

  const totalSizeMb = queue
    .reduce((acc, item) => acc + item.sizeMb, 0)
    .toFixed(1);
  const readyCount = queue.filter((item) => item.status === "validated").length;

  const eventIdForUpload = () =>
    selectedEvent === "other" ? null : selectedEvent;

  const markQueue = (id: string, patch: Partial<QueuedItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleFilesChosen = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const room = MAX_BATCH - queue.length;
    if (room <= 0) {
      showToast("You can upload 20 photos at a time.");
      return;
    }
    const accepted = incoming.slice(0, room);
    if (incoming.length > room) {
      showToast("Only the first 20 photos in this batch were added.");
    }
    const newItems: QueuedItem[] = accepted.map((file) => {
      const id = crypto.randomUUID();
      const tooBig = file.size > MAX_BYTES || file.size < 1;
      const wrongType = !ALLOWED.has(file.type);
      if (!tooBig && !wrongType) filesRef.current.set(id, file);
      return {
        id,
        name: file.name,
        sizeMb: Number((file.size / (1024 * 1024)).toFixed(1)),
        status: tooBig || wrongType ? "needs_attention" : "validated",
        progress: tooBig || wrongType ? 0 : 100,
        previewUrl: URL.createObjectURL(file),
        errorMessage: tooBig
          ? "Each photo must be 10 MB or smaller."
          : wrongType
            ? "Use a JPEG, PNG, or WebP photo."
            : undefined,
      };
    });
    setQueue((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadOne = async (item: QueuedItem) => {
    try {
      return await sendOne(item);
    } catch {
      markQueue(item.id, {
        status: "needs_attention",
        retryable: true,
        errorMessage: "The photo was not saved. Try again.",
      });
      return false;
    }
  };

  const sendOne = async (item: QueuedItem) => {
    const file = filesRef.current.get(item.id);
    if (!file) {
      markQueue(item.id, {
        status: "needs_attention",
        errorMessage: "Choose this photo again.",
        retryable: false,
      });
      return false;
    }
    markQueue(item.id, {
      status: "uploading",
      progress: 10,
      errorMessage: undefined,
    });
    const mimeType = file.type;
    const eventId = eventIdForUpload();
    const reserved = await tabFetch("/api/photos/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
        eventId,
      }),
    });
    const reservedJson = await reserved.json().catch(() => null);
    if (!reserved.ok || !reservedJson?.data?.uploadUrl) {
      markQueue(item.id, {
        status: "needs_attention",
        retryable: true,
        errorMessage:
          reservedJson?.error?.message ??
          "Photo storage is not available right now.",
      });
      return false;
    }
    markQueue(item.id, { progress: 40 });
    let stored: Response;
    try {
      stored = await fetch(reservedJson.data.uploadUrl, {
        method: "PUT",
        headers: { "content-type": mimeType },
        body: file,
      });
    } catch {
      markQueue(item.id, {
        status: "needs_attention",
        retryable: true,
        errorMessage: "The photo did not reach storage. Try again.",
      });
      return false;
    }
    if (!stored.ok) {
      markQueue(item.id, {
        status: "needs_attention",
        retryable: true,
        errorMessage: "The photo did not reach storage. Try again.",
      });
      return false;
    }
    markQueue(item.id, { progress: 75 });
    const confirmed = await tabFetch("/api/photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        objectKey: reservedJson.data.objectKey,
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
        eventId,
      }),
    });
    const confirmedJson = await confirmed.json().catch(() => null);
    if (!confirmed.ok) {
      markQueue(item.id, {
        status: "needs_attention",
        retryable: true,
        errorMessage:
          confirmedJson?.error?.message ??
          "The photo was stored, but it could not be added to the gallery.",
      });
      return false;
    }
    filesRef.current.delete(item.id);
    markQueue(item.id, { status: "uploaded", progress: 100 });
    return true;
  };

  const handleRetryItem = (itemId: string) => {
    const item = queue.find((entry) => entry.id === itemId);
    if (!item || isUploading) return;
    setIsUploading(true);
    void uploadOne(item)
      .then(async (ok) => {
        if (ok) await loadPhotos();
      })
      .finally(() => setIsUploading(false));
  };

  const handleRemoveQueueItem = (itemId: string) => {
    const item = queue.find((entry) => entry.id === itemId);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    filesRef.current.delete(itemId);
    setQueue((prev) => prev.filter((entry) => entry.id !== itemId));
  };

  const handleUploadQueue = async () => {
    const ready = queue.filter((item) => item.status === "validated");
    if (ready.length === 0) return;
    setIsUploading(true);
    let saved = 0;
    for (const item of ready) {
      if (await uploadOne(item)) saved += 1;
    }
    if (saved > 0) await loadPhotos();
    setIsUploading(false);
    if (saved === ready.length) {
      filesRef.current.clear();
      setQueue((prev) => {
        prev.forEach((item) => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        return [];
      });
      setUploadModalOpen(false);
      showToast(
        `Saved ${saved} photo${saved === 1 ? "" : "s"} to your private gallery.`,
      );
    } else {
      showToast(
        saved > 0
          ? `Saved ${saved} of ${ready.length}. The rest need another try.`
          : "Those photos were not saved. Check the notes and try again.",
      );
    }
  };

  const handleDownload = async (photo: GalleryPhoto) => {
    try {
      const response = await tabFetch(`/api/photos/${photo.id}/download`);
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.data?.url) {
        showToast(
          json?.error?.message ?? "That photo could not be downloaded.",
        );
        return;
      }
      window.location.assign(json.data.url);
    } catch {
      showToast("That photo could not be downloaded.");
    }
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (
      deletingId ||
      !window.confirm(
        `Permanently delete “${photo.title}” from this wedding gallery? This cannot be undone.`,
      )
    )
      return;
    setDeletingId(photo.id);
    try {
      const response = await tabFetch(`/api/photos/${photo.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      ++refreshVersion.current;
      setIsRefreshing(false);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setAlbumTotal((current) => Math.max(0, current - 1));
      setLightboxPhoto(null);
      showToast("Photo deleted from the gallery and storage.");
    } catch {
      showToast("Could not delete this photo. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const collectAlbum = async (album: string) => {
    const collected: GalleryPhoto[] = [];
    let cursor: string | null = null;
    let bytes = 0;
    for (let page = 0; page < 100; page += 1) {
      const loaded = await fetchPhotoPage(album, cursor);
      for (const photo of loaded.page) {
        if (collected.some((item) => item.id === photo.id)) continue;
        bytes += photo.sizeBytes;
        if (bytes > 100 * 1024 * 1024) return null;
        collected.push(photo);
      }
      if (!loaded.nextCursor) return collected;
      cursor = loaded.nextCursor;
    }
    return null;
  };

  const handleDownloadAll = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const album = await collectAlbum(activeTab);
      if (!album) {
        showToast(
          "This album exceeds the 100 MB ZIP limit. Choose a smaller event album or download individual photos.",
        );
        return;
      }
      const { zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {};
      let bytes = 0;
      for (const photo of album) {
        const signed = await tabFetch(`/api/photos/${photo.id}/download`, {
          cache: "no-store",
        });
        if (!signed.ok) throw new Error();
        const json = await signed.json();
        const response = await fetch(json.data.url, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = new Uint8Array(await response.arrayBuffer());
        bytes += data.length;
        if (bytes > 100 * 1024 * 1024) throw new Error();
        files[
          `${photo.id}-${photo.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        ] = data;
      }
      const archive = zipSync(files, { level: 0 });
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(archive)], { type: "application/zip" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "wedding-photos.zip";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      showToast("Your ZIP download is ready.");
    } catch {
      showToast(
        "Could not download the complete ZIP. Refresh and try again; storage must allow browser GET requests.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] pb-24 text-[#1F1E1D]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#1E1A1F] px-4 py-3 text-xs font-medium text-white shadow-xl transition-all">
          <span className="text-[#FBB6A8]">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        id={fileInputId}
        onChange={(e) => handleFilesChosen(e.target.files)}
      />

      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-8 sm:pt-10">
        {/* Header Section with Editorial Typography */}
        <header className="flex flex-col justify-between gap-4 pb-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="mb-2 block text-[11px] font-bold tracking-[0.22em] text-[#865045] uppercase">
              Your Celebration, Remembered
            </span>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#500926] sm:text-4xl">
              Wedding Gallery
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#7A7269] sm:text-sm">
              All your wedding memories, beautifully gathered in one place.
              Upload, relive, and keep every little moment close.
            </p>
          </div>

          {/* Right Action Array */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Photo Counter Badge */}
            <div className="flex items-center gap-2 rounded-xl border border-[#E8E2D9] bg-white px-3.5 py-2 shadow-2xs">
              <svg
                className="h-4 w-4 text-[#7A7269]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <circle cx="12" cy="13" r="3" strokeWidth="2" />
              </svg>
              <span className="text-xs font-semibold text-[#1F1E1D]">
                {albumTotal} photo{albumTotal === 1 ? "" : "s"}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#6D213C] px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(109,33,60,0.2)] transition hover:bg-[#5B1A31] hover:shadow-[0_6px_20px_rgba(109,33,60,0.3)] active:scale-98"
            >
              <span>+ Upload photos</span>
            </button>
          </div>
        </header>

        {/* Sub-navigation: Event Category Filter Pills & Tools */}
        <nav
          aria-label="Event Galleries"
          className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D9] pb-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", name: "All photos" },
              ...events,
              ...Array.from(new Set(photos.map((photo) => photo.category)))
                .filter(
                  (id) =>
                    id !== "other" && !events.some((event) => event.id === id),
                )
                .map((id) => ({ id, name: "Archived event" })),
              { id: "other", name: "Wedding Memories" },
            ].map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setActiveTab(event.id);
                  void loadPhotos(event.id);
                }}
                aria-pressed={activeTab === event.id}
                className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${activeTab === event.id ? "bg-[#6D213C] text-white shadow-xs" : "bg-white text-[#7A7269] hover:bg-[#F4EBF2]"}`}
              >
                {event.name}
              </button>
            ))}
          </div>

          {/* Quick Action Controls on the Right */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadPhotos()}
              disabled={isRefreshing || deletingId !== null}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#865045] transition hover:bg-[#F4EBF2] hover:text-[#500926]"
            >
              <svg
                className={`h-4 w-4 transition-transform duration-500 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </nav>

        {loadError && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            Refresh failed. The photos shown may be out of date. Please try
            again.
          </p>
        )}
        {/* Dynamic Photo Mosaic / Populated Gallery */}
        {filteredPhotos.length > 0 ? (
          <section className="mt-6 flex flex-col">
            {/* Batch Action Ribbon */}
            <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="font-serif text-base font-bold text-[#500926]">
                  {activeTab === "all"
                    ? "All Photographs"
                    : `${filteredPhotos[0]?.categoryLabel || "Selected"} Photographs`}
                </span>
                <span className="rounded-full bg-[#FFDAD3] px-2.5 py-0.5 text-[11px] font-semibold text-[#351008]">
                  {albumTotal} Items
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isDownloading || isRefreshing}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E8E2D9] bg-white px-3 py-1.5 text-xs font-semibold text-[#7A7269] shadow-2xs transition hover:bg-[#FAF8F5] hover:text-[#1F1E1D]"
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
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>{isDownloading ? "Preparing ZIP…" : "Download Zip"}</span>
              </button>
            </div>

            {/* Bento Mosaic Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
              {filteredPhotos.map((photo, index) => {
                const isFull = photo.span === "full" || index === 0;
                const isHalf = photo.span === "half" || index === 1;

                const colClass = isFull
                  ? "lg:col-span-8"
                  : isHalf
                    ? "lg:col-span-4"
                    : "lg:col-span-4";

                const isFav = !!favorites[photo.id];

                return (
                  <div
                    key={photo.id}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_-4px_rgba(109,33,60,0.06)] transition hover:shadow-lg ${colClass}`}
                  >
                    <div
                      className={`relative w-full cursor-pointer overflow-hidden ${
                        isFull
                          ? "h-[340px] sm:h-[400px]"
                          : isHalf
                            ? "h-[320px] sm:h-[350px]"
                            : "h-[260px]"
                      }`}
                      onClick={() => setLightboxPhoto(photo)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        {photo.badge && (
                          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold tracking-wider text-[#6D213C] uppercase shadow-xs backdrop-blur-md">
                            {photo.badge}
                          </span>
                        )}
                      </div>

                      {/* Quick Action Buttons on Hover */}
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={deletingId !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(photo);
                          }}
                          className="rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-red-800"
                          aria-label={`Delete ${photo.title}`}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(photo.id);
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition hover:scale-110 ${
                            isFav
                              ? "bg-[#6D213C] text-white"
                              : "bg-white/90 text-[#6D213C] hover:bg-white"
                          }`}
                          title="Favorite"
                        >
                          <svg
                            className="h-4 w-4"
                            fill={isFav ? "currentColor" : "none"}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownload(photo);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1F1E1D] backdrop-blur-md transition hover:scale-110 hover:bg-white"
                          title="Download high-resolution"
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
                              strokeWidth="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Bottom Image Label Info */}
                      <div className="absolute right-5 bottom-4 left-5 text-white">
                        {photo.location && (
                          <span className="text-[11px] font-semibold tracking-widest text-[#FFD9E1] uppercase">
                            {photo.location}
                          </span>
                        )}
                        <h2 className="mt-1 font-serif text-lg font-bold text-white drop-shadow-xs sm:text-xl">
                          {photo.title}
                        </h2>
                      </div>
                    </div>

                    {/* Bottom Metadata Bar */}
                    <div className="flex items-center justify-between p-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFDAD3] text-[10px] font-bold text-[#351008]">
                          {wedding.brideName[0] || "W"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#1F1E1D]">
                            {photo.curator || photo.photographer || "Curated"}
                          </span>
                          {photo.dateLabel && (
                            <span className="text-[11px] text-[#7A7269]">
                              {photo.dateLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-[#865045]">
                        {photo.fileSize || "Archival Quality"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {nextCursor && (
              <button
                type="button"
                onClick={() => void loadPhotos(activeTab, nextCursor)}
                disabled={isLoadingMore || isRefreshing}
                className="mx-auto mt-8 cursor-pointer rounded-xl border border-[#E8E2D9] bg-white px-5 py-2.5 text-xs font-semibold text-[#6D213C] shadow-2xs transition hover:bg-[#F4EBF2] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? "Loading…" : "Load more photos"}
              </button>
            )}
          </section>
        ) : (
          /* Empty State Canvas (matching Screen 83c2664a) */
          <main className="relative mt-8 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#FAF8F5] p-8 text-center shadow-[0_4px_24px_-4px_rgba(37,33,38,0.04)] md:px-12 md:py-24">
            {/* Subtle Decorative Ambient Halos */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#FFDAD3]/40 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[#FFD9E1]/30 blur-3xl" />

            {/* Centered Emblem Icon Badge */}
            <div className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F4EBF2] text-[#865045] shadow-xs md:h-24 md:w-24">
              <svg
                className="h-10 w-10 md:h-12 md:w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            {/* Editorial Typography & Message */}
            <div className="relative z-10 flex max-w-lg flex-col items-center">
              <span className="mb-2 text-[11px] font-bold tracking-[0.24em] text-[#865045] uppercase">
                {loadError
                  ? "Could not load photos"
                  : "Every photo tells your story"}
              </span>
              <h2 className="mb-3 font-serif text-2xl font-bold tracking-tight text-[#500926] sm:text-3xl">
                {loadError
                  ? "The gallery did not load"
                  : "Your memories begin here"}
              </h2>
              <p className="mb-8 max-w-md text-xs leading-relaxed text-[#7A7269] sm:text-sm">
                {loadError
                  ? "Refresh the page and try again. Photos already saved stay in private storage."
                  : "From the first celebration to the last dance, give your favourite moments a home. JPEG, PNG, and WebP photos up to 10 MB are saved to this wedding's private gallery."}
              </p>

              {/* Main Action CTA Button */}
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#6D213C] px-6 py-3 text-xs font-bold text-white shadow-[0_8px_24px_rgba(109,33,60,0.22)] transition hover:-translate-y-0.5 hover:bg-[#5B1A31] hover:shadow-[0_12px_32px_rgba(109,33,60,0.3)] active:translate-y-0 active:scale-95"
              >
                <span>+ Upload your first photos</span>
              </button>
            </div>

            {/* Micro Features Footnote Grid */}
            <div className="relative z-10 mt-16 grid w-full max-w-2xl grid-cols-1 gap-4 border-t border-[#E8E2D9] pt-8 text-left md:grid-cols-3">
              <div className="flex flex-col gap-1 rounded-xl bg-white/80 p-4 shadow-2xs backdrop-blur-xs">
                <div className="flex items-center gap-2 font-serif text-sm font-bold text-[#500926]">
                  <span className="text-[#865045]">✦</span>
                  <span>Private storage</span>
                </div>
                <span className="text-[11.5px] leading-relaxed text-[#7A7269]">
                  JPEG, PNG, and WebP photos stay in your wedding&apos;s private
                  gallery.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-white/80 p-4 shadow-2xs backdrop-blur-xs">
                <div className="flex items-center gap-2 font-serif text-sm font-bold text-[#500926]">
                  <span className="text-[#865045]">✦</span>
                  <span>10 MB each</span>
                </div>
                <span className="text-[11.5px] leading-relaxed text-[#7A7269]">
                  Upload up to 20 photos at a time. Each photo must be 10 MB or
                  smaller.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-white/80 p-4 shadow-2xs backdrop-blur-xs">
                <div className="flex items-center gap-2 font-serif text-sm font-bold text-[#500926]">
                  <span className="text-[#865045]">✦</span>
                  <span>Members only</span>
                </div>
                <span className="text-[11.5px] leading-relaxed text-[#7A7269]">
                  In the app, photos are available to your wedding members. The
                  service operator also has access to stored files. Guest
                  sharing comes later.
                </span>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-4xl flex-col overflow-hidden rounded-2xl bg-[#1E1A1F] text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex max-h-[75vh] items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxPhoto.imageUrl}
                alt={lightboxPhoto.title}
                className="max-h-[75vh] w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/90"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between p-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">
                  {lightboxPhoto.title}
                </h3>
                <p className="text-xs text-[#CBC6C0]">
                  {lightboxPhoto.categoryLabel} ·{" "}
                  {lightboxPhoto.location || "Royal Celebration"}
                </p>
              </div>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => void handleDelete(lightboxPhoto)}
                className="rounded-lg border border-red-400 px-4 py-2 text-xs text-red-200"
              >
                {deletingId === lightboxPhoto.id ? "Deleting…" : "Delete photo"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDownload(lightboxPhoto);
                  setLightboxPhoto(null);
                }}
                className="rounded-lg bg-[#6D213C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5B1A31]"
              >
                Download Original
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD PHOTOS MODAL (Matching Stitch media_1791670169052.png & Screens 2 & 3) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setUploadModalOpen(false)}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#E8E2D9] bg-white shadow-2xl">
            {/* Top accent line */}
            <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-[#6D213C] via-[#9E3E5B] to-[#C89D47]" />

            <div className="flex-1 overflow-y-auto p-6 sm:p-7">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-[#B54708] uppercase">
                    A Collection of Moments
                  </span>
                  <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#1F1E1D]">
                    Upload photos
                  </h2>
                  <p className="mt-1 text-xs text-[#7A7269]">
                    Bring your wedding memories together, one photo at a time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#F5F2EC] text-[#7A7269] transition hover:bg-[#EAE4D9] hover:text-[#1F1E1D]"
                >
                  ✕
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFilesChosen(event.dataTransfer.files);
                }}
                className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E8E2D9] bg-[#FAF8F5] p-8 text-center transition hover:border-[#6D213C]/40 hover:bg-[#FFF9FA]"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#6D213C] shadow-xs">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-[#1F1E1D]">
                  Drop your photos here
                </h4>
                <p className="mt-1 text-xs text-[#7A7269]">
                  or <span className="underline">browse files</span>
                </p>
                <span className="mt-3 text-[11px] text-[#A8A199]">
                  JPEG, PNG or WebP · Up to 10 MB each · 20 per batch
                </span>
              </div>

              {/* Assign to Event */}
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-xs font-semibold text-[#1F1E1D]">
                    Assign these photos to an event{" "}
                    <span className="font-normal text-[#7A7269]">
                      (optional)
                    </span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#865045]">
                    {events.length} Ceremonies
                  </span>
                </div>
                <select
                  value={selectedEvent}
                  disabled={isUploading}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E2D9] bg-white px-3.5 py-2.5 text-xs text-[#1F1E1D] shadow-2xs focus:border-[#6D213C] focus:outline-hidden"
                >
                  <option value="other">Other / Wedding Memories</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* QUEUED FILES SECTION (Matching media_1791670169052.png) */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold tracking-wider text-[#7A7269] uppercase">
                    Queued Files ({queue.length} of {queue.length})
                  </span>
                  <span className="text-[11px] font-medium text-[#7A7269]">
                    {totalSizeMb} MB Total
                  </span>
                </div>

                <div className="space-y-2.5">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#E8E2D9] bg-white p-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {/* Thumbnail */}
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#FAF8F5]">
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-[#7A7269]">
                                📷
                              </div>
                            )}
                            {item.status === "uploaded" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-white">
                                ✓
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-[#1F1E1D]">
                              {item.name}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#7A7269]">
                              <span>{item.sizeMb} MB</span>
                              <span>•</span>
                              {item.status === "needs_attention" && (
                                <span className="font-semibold text-[#B54708]">
                                  ⚠ Needs attention
                                </span>
                              )}
                              {item.status === "validated" && (
                                <span className="font-semibold text-[#276738]">
                                  Ready to upload
                                </span>
                              )}
                              {item.status === "uploading" && (
                                <span className="font-semibold text-[#865045]">
                                  Uploading {item.progress ?? 0}%
                                </span>
                              )}
                              {item.status === "uploaded" && (
                                <span className="text-[#7A7269]">
                                  Ready for gallery
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right action status */}
                        <div className="flex shrink-0 items-center gap-2">
                          {item.status === "needs_attention" &&
                            item.retryable && (
                              <button
                                type="button"
                                onClick={() => handleRetryItem(item.id)}
                                className="flex cursor-pointer items-center gap-1 rounded-md border border-[#E8E2D9] bg-white px-2 py-1 text-[11px] font-semibold text-[#1F1E1D] transition hover:bg-[#FAF8F5]"
                              >
                                <span>↻ Retry</span>
                              </button>
                            )}
                          {item.status === "validated" && (
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-[#EBF4EC] px-2 py-0.5 text-[10px] font-bold text-[#276738]">
                                Ready
                              </span>
                              <span className="text-[11px] text-[#7A7269]">
                                100%
                              </span>
                            </div>
                          )}
                          {item.status === "uploaded" && (
                            <span className="rounded-full bg-[#FFDAD3] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#351008]">
                              ✓ Uploaded
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveQueueItem(item.id)}
                            disabled={isUploading}
                            className="cursor-pointer text-xs text-[#7A7269] hover:text-[#1F1E1D]"
                            title="Remove file"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Error Alert Callout (Addresses R2 pending status gracefully) */}
                      {item.errorMessage && (
                        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-[#FFF2ED] p-2.5 text-[11px] text-[#865045]">
                          <span className="mt-0.5 font-bold">ℹ</span>
                          <span>{item.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pinned Modal Footer */}
            <div className="flex shrink-0 flex-col gap-3 border-t border-[#F0EAE1] bg-[#FAF8F5] px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-center gap-1.5 text-[11px] text-[#7A7269]">
                <span>🔒</span>
                <span>Private wedding storage</span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="cursor-pointer rounded-xl border border-[#E8E2D9] bg-white px-4 py-2 text-xs font-semibold text-[#7A7269] transition hover:bg-[#FAF8F5] hover:text-[#1F1E1D]"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={isUploading || readyCount === 0}
                  onClick={handleUploadQueue}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#6D213C] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#5B1A31] disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      <span>
                        Upload {readyCount} photo
                        {readyCount === 1 ? "" : "s"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
