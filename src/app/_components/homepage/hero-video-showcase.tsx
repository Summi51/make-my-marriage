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
  const [hasInteracted, setHasInteracted] = useState(false);
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
    setHasInteracted(true);
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
    setHasInteracted(true);
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
            { rootMargin: "240px 0px", threshold: 0.35 },
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
      className="relative mx-auto max-w-5xl scroll-mt-28 px-4 pt-2 pb-20"
      data-purpose="hero-video-showcase"
    >
      <div className="mb-6 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#E5D8D3] bg-[#FAF6F2] px-3.5 py-1 text-[11px] font-semibold tracking-widest text-[#865045] uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6d213c]" />
          Moments That Matter
        </p>
        <h2 className="font-editorial mt-2 text-2xl font-normal tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
          Feel the joy of an Indian wedding
        </h2>
        <p className="mt-1 text-xs text-gray-600 sm:text-sm">
          Every sacred tradition, joyful dance, and shared smile — brought
          together effortlessly.
        </p>
      </div>
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
      {!hasInteracted && isMuted && !failed ? (
        <p className="mt-3 text-center text-xs text-[#865045]">
          The film stays silent until you choose Tap for Sound.
        </p>
      ) : null}
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
      className="relative overflow-hidden rounded-2xl border-2 border-[#E6DDD3] bg-black shadow-[0_20px_50px_rgba(109,33,60,0.12)]"
    >
      <div className="relative aspect-video w-full bg-black">
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
        <button
          type="button"
          className="absolute inset-0 cursor-pointer"
          onClick={onPlay}
          aria-label={isPlaying ? "Pause wedding film" : "Play wedding film"}
          disabled={failed}
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/30" />
        {failed ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white">
            This film could not load. Refresh the page to try again.
          </p>
        ) : null}
        {!isPlaying && !failed ? <PlayMark /> : null}
        <FilmControls
          failed={failed}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
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
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-black/50 text-white backdrop-blur-md">
        <svg
          className="ml-1 h-7 w-7"
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
  isMuted,
  isFullscreen,
  progress,
  currentTime,
  duration,
  onSound,
  onFullscreen,
  onSeek,
  videoRef,
}: {
  failed: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  progress: number;
  currentTime: string;
  duration: string;
  onSound: () => void;
  onFullscreen: () => void;
  onSeek: (seconds: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  return (
    <>
      <p className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-md">
        <span className="bg-brand-gold h-2 w-2 rounded-full" />
        Celebration film
      </p>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={onSound}
          disabled={failed}
          aria-pressed={!isMuted}
          aria-label={isMuted ? "Unmute video audio" : "Mute video audio"}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md ${
            isMuted
              ? "border-white/20 bg-black/50 hover:bg-black/70"
              : "border-brand-gold bg-[#6d213c]/80 hover:bg-[#6d213c]"
          }`}
        >
          {isMuted ? "Tap for Sound" : "Sound On"}
        </button>
        <button
          type="button"
          onClick={onFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-sm text-white backdrop-blur-md hover:bg-black/70"
        >
          {isFullscreen ? "×" : "⛶"}
        </button>
      </div>
      <div className="absolute right-0 bottom-0 left-0 z-10 p-4 sm:p-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-white">
          <p className="font-editorial text-sm text-white/90 sm:text-base">
            From Haldi and Mehndi to the reception — celebrate every moment
            together.
          </p>
          <p className="font-mono text-xs text-white/70">
            {currentTime} / {duration}
          </p>
        </div>
        <label className="sr-only" htmlFor="celebration-film-seek">
          Film position
        </label>
        <input
          id="celebration-film-seek"
          className="accent-brand-gold h-1.5 w-full cursor-pointer"
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          aria-valuetext={`${currentTime} of ${duration}`}
          disabled={failed || duration === "0:00"}
          onChange={(event) => {
            const video = videoRef.current;
            if (!video || !Number.isFinite(video.duration)) return;
            onSeek((Number(event.target.value) / 100) * video.duration);
          }}
        />
      </div>
    </>
  );
}
