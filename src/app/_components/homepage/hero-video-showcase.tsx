"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function HeroVideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const userPausedRef = useRef(false);
  const failedRef = useRef(false);
  const shownSecondRef = useRef(-1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  const syncProgress = useCallback((current: number, total: number) => {
    if (!Number.isFinite(total) || total <= 0) return;
    const second = Math.floor(current);
    if (second === shownSecondRef.current) return;
    shownSecondRef.current = second;
    setProgress(Math.max(0, Math.min(100, (current / total) * 100)));
    setCurrentTime(formatTime(current));
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }
      video.currentTime = Math.max(0, Math.min(video.duration, seconds));
      shownSecondRef.current = -1;
      syncProgress(video.currentTime, video.duration);
    },
    [syncProgress],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || failedRef.current) return;
    if (video.paused) {
      userPausedRef.current = false;
      void video.play().catch(() => setIsPlaying(false));
      return;
    }
    userPausedRef.current = true;
    video.pause();
  }, []);

  const toggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted && video.paused && !failedRef.current) {
      userPausedRef.current = false;
      void video.play().catch(() => setIsPlaying(false));
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current as FullscreenVideo | null;
    const frame = frameRef.current;
    if (!video || !frame) return;
    if (document.fullscreenElement === frame) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (video.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen?.();
      return;
    }
    if (typeof frame.requestFullscreen !== "function") {
      video.webkitEnterFullscreen?.();
      return;
    }
    void frame.requestFullscreen().catch(() => {
      video.webkitEnterFullscreen?.();
    });
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame) return;
    video.muted = true;

    const syncFullscreen = () => {
      const node = videoRef.current as FullscreenVideo | null;
      setIsFullscreen(
        document.fullscreenElement === frame ||
          Boolean(node?.webkitDisplayingFullscreen),
      );
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      const node = videoRef.current;
      if (!node) return;
      syncProgress(node.currentTime, node.duration);
    };
    const onReady = () => {
      const node = videoRef.current;
      if (!node) return;
      setDuration(formatTime(node.duration));
    };
    const onError = () => {
      failedRef.current = true;
      setFailed(true);
      setIsPlaying(false);
    };
    const startPlayback = () => {
      const node = videoRef.current;
      if (!node || failedRef.current || userPausedRef.current) return;
      if (prefersReducedMotion()) return;
      void node.play().catch(() => setIsPlaying(false));
    };

    video.addEventListener("canplay", startPlayback);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
    video.addEventListener("webkitbeginfullscreen", syncFullscreen);
    video.addEventListener("webkitendfullscreen", syncFullscreen);
    document.addEventListener("fullscreenchange", syncFullscreen);

    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            ([entry]) => {
              if (!entry?.isIntersecting) {
                videoRef.current?.pause();
                return;
              }
              setShouldLoad(true);
              startPlayback();
            },
            { rootMargin: "240px 0px", threshold: 0.25 },
          )
        : null;
    if (!observer) setShouldLoad(true);
    else observer.observe(frame);

    return () => {
      observer?.disconnect();
      video.removeEventListener("canplay", startPlayback);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
      video.removeEventListener("webkitbeginfullscreen", syncFullscreen);
      video.removeEventListener("webkitendfullscreen", syncFullscreen);
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, [syncProgress]);

  return (
    <section
      id="celebration-film"
      aria-label="Wedding celebration film"
      className="relative mx-auto max-w-5xl scroll-mt-24 px-4 pt-2 pb-16 sm:pb-20"
      data-purpose="hero-video-showcase"
    >
      {/* Section Headline */}
      <div className="mb-5 text-center sm:mb-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#E5D8D3] bg-[#FAF6F2] px-3 py-1 text-[10px] font-semibold tracking-widest text-[#865045] uppercase sm:px-3.5 sm:text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6d213c]" />
          Moments That Matter
        </p>
        <h2 className="font-editorial mt-2 text-2xl font-normal tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
          Feel the joy of an Indian wedding
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-xs text-gray-600 sm:text-sm">
          Every sacred tradition, joyful dance, and shared smile — brought
          together effortlessly.
        </p>
      </div>

      {/* Main Luxury Video Player Frame */}
      <FilmFrame
        frameRef={frameRef}
        videoRef={videoRef}
        failed={failed}
        isPlaying={isPlaying}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        progress={progress}
        currentTime={currentTime}
        duration={duration}
        onPlay={togglePlay}
        onSound={toggleSound}
        onFullscreen={toggleFullscreen}
        onSeek={seekTo}
        source={shouldLoad ? "/videos/hero-wedding.mp4" : undefined}
      />

      {/* Editorial Caption Bar - Cleanly placed BELOW the video to prevent any overlap */}
      <div className="mt-3.5 flex flex-col items-center justify-between gap-2.5 rounded-xl border border-[#EDE5DB] bg-[#FAF7F2] p-3 text-center sm:mt-4 sm:flex-row sm:px-5 sm:py-3 sm:text-left">
        <div className="flex items-center gap-2">
          <span className="text-[#865045]" aria-hidden="true">
            “
          </span>
          <p className="font-editorial text-xs text-gray-800 sm:text-sm md:text-base">
            From Haldi &amp; Mehndi to the Grand Reception — celebrate every
            moment together.
          </p>
          <span className="text-[#865045]" aria-hidden="true">
            ”
          </span>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E4DBD0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#6d213c] transition hover:bg-[#F4EFEA] sm:text-xs"
        >
          <span>{isMuted ? "🔇 Tap for sound" : "🔊 Sound is on"}</span>
        </button>
      </div>
    </section>
  );
}

function FilmFrame({
  frameRef,
  videoRef,
  failed,
  isPlaying,
  isMuted,
  isFullscreen,
  progress,
  currentTime,
  duration,
  onPlay,
  onSound,
  onFullscreen,
  onSeek,
  source,
}: {
  frameRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  failed: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  progress: number;
  currentTime: string;
  duration: string;
  onPlay: () => void;
  onSound: () => void;
  onFullscreen: () => void;
  onSeek: (seconds: number) => void;
  source?: string;
}) {
  return (
    <div
      ref={frameRef}
      className="group relative overflow-hidden rounded-2xl border-2 border-[#E6DDD3] bg-black shadow-[0_12px_36px_rgba(109,33,60,0.10)] sm:rounded-3xl sm:shadow-[0_20px_50px_rgba(109,33,60,0.14)]"
    >
      <div className="relative aspect-video w-full bg-black select-none">
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={source}
          playsInline
          muted
          loop
          preload="metadata"
          aria-label="Indian wedding celebration film"
        />

        {/* Click surface for toggling play/pause */}
        <button
          type="button"
          className="absolute inset-0 cursor-pointer"
          onClick={onPlay}
          aria-label={isPlaying ? "Pause wedding film" : "Play wedding film"}
          disabled={failed}
        />

        {/* Minimal edge-only gradients (top 48px, bottom 56px) - Keeps middle 80% completely unobstructed */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent sm:h-20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/30 to-transparent sm:h-24" />

        {/* Error message if video fails to load */}
        {failed ? (
          <p className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 text-center text-sm text-white">
            This film could not load. Refresh the page to try again.
          </p>
        ) : null}

        {/* Center Play Indicator when paused */}
        {!isPlaying && !failed ? <PlayMark /> : null}

        {/* Responsive, Unobtrusive Controls */}
        <FilmControls
          failed={failed}
          isPlaying={isPlaying}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          onPlay={onPlay}
          onSound={onSound}
          onFullscreen={onFullscreen}
          onSeek={onSeek}
          videoRef={videoRef}
        />
      </div>
    </div>
  );
}

function PlayMark() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/60 text-white backdrop-blur-md transition-transform duration-200 sm:h-16 sm:w-16">
        <svg
          className="ml-1 h-5 w-5 sm:h-7 sm:w-7"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function FilmControls({
  failed,
  isPlaying,
  isMuted,
  isFullscreen,
  progress,
  currentTime,
  duration,
  onPlay,
  onSound,
  onFullscreen,
  onSeek,
  videoRef,
}: {
  failed: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  progress: number;
  currentTime: string;
  duration: string;
  onPlay: () => void;
  onSound: () => void;
  onFullscreen: () => void;
  onSeek: (seconds: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const ready = duration !== "0:00";
  const seekByRatio = (ratio: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }
    onSeek(Math.max(0, Math.min(1, ratio)) * video.duration);
  };

  return (
    <>
      {/* Top Left: Clean Badge (Compact on mobile) */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 sm:top-4 sm:left-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
          <span>Celebration film</span>
        </span>
      </div>

      {/* Top Right: Sound & Fullscreen Controls (Touch-friendly & compact) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 sm:top-4 sm:right-4 sm:gap-2">
        {/* Sound toggle button */}
        <button
          type="button"
          onClick={onSound}
          disabled={failed}
          aria-pressed={!isMuted}
          aria-label={isMuted ? "Unmute video audio" : "Mute video audio"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-all sm:px-3.5 sm:py-1.5 sm:text-xs ${
            isMuted
              ? "border-white/20 bg-black/50 hover:bg-black/70"
              : "border-[#D4AF37] bg-[#6d213c]/85 text-[#FFF7E6] shadow-sm hover:bg-[#6d213c]"
          }`}
        >
          {isMuted ? (
            <>
              <svg
                className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
              <span>Tap for Sound</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-0.5" aria-hidden="true">
                <span className="inline-block h-2.5 w-0.5 animate-pulse rounded-full bg-white" />
                <span className="inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-white" />
                <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-white" />
              </span>
              <span>Sound On</span>
            </>
          )}
        </button>

        {/* Fullscreen button */}
        <button
          type="button"
          onClick={onFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/50 text-xs text-white backdrop-blur-md transition hover:bg-black/70 sm:h-8 sm:w-8 sm:text-sm"
        >
          {isFullscreen ? "✕" : "⛶"}
        </button>
      </div>

      {/* Bottom Control Bar: Sleek Scrubber & Minimalist Time (No text blocking the video) */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 py-2.5 sm:px-5 sm:py-3">
        <div
          role="slider"
          tabIndex={failed || !ready ? -1 : 0}
          aria-label="Film position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${currentTime} of ${duration}`}
          aria-disabled={failed || !ready}
          onClick={(event) => {
            if (failed || !ready) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) return;
            seekByRatio((event.clientX - rect.left) / rect.width);
          }}
          onKeyDown={(event) => {
            if (failed || !ready) return;
            const step = event.shiftKey ? 10 : 5;
            if (event.key === "ArrowRight") {
              event.preventDefault();
              seekByRatio((progress + step) / 100);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              seekByRatio((progress - step) / 100);
            } else if (event.key === "Home") {
              event.preventDefault();
              seekByRatio(0);
            } else if (event.key === "End") {
              event.preventDefault();
              seekByRatio(1);
            }
          }}
          className="group/seek relative flex h-6 w-full cursor-pointer items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {/* Background track */}
          <div className="h-1 w-full rounded-full bg-white/25 transition-all group-hover/seek:h-1.5">
            {/* Fill track with gold gradient */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5989B]"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Subtle scrubber thumb indicator */}
          <div
            className="absolute -ml-1.5 h-3 w-3 rounded-full border border-white bg-[#D4AF37] opacity-0 shadow-xs transition-opacity group-hover/seek:opacity-100 group-focus-visible/seek:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Bottom Status Row: Mini Play/Pause + Time Counter */}
        <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-white/80 sm:text-xs">
          <button
            type="button"
            onClick={onPlay}
            aria-label={isPlaying ? "Pause wedding film" : "Play wedding film"}
            className="flex items-center gap-1 font-sans text-[11px] text-white/90 hover:text-white"
          >
            {isPlaying ? (
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-0.5 bg-white" />
                <span className="inline-block h-2 w-0.5 bg-white" />
                <span className="hidden sm:inline">Pause</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <span>▶</span>
                <span className="hidden sm:inline">Play</span>
              </span>
            )}
          </button>
          <div>
            <span>{currentTime}</span>
            <span className="mx-1 text-white/40">/</span>
            <span>{duration}</span>
          </div>
        </div>
      </div>
    </>
  );
}
