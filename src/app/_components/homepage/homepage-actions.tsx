"use client";

import { useId, useRef, type ReactNode } from "react";
import Link from "next/link";

function PreviewDialog({
  label,
  className,
  title,
  children,
}: {
  label: ReactNode;
  className: string;
  title: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="homepage-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-content">
          <div className="mb-5 flex items-start justify-between gap-5">
            <h2
              id={titleId}
              className="font-editorial text-brand-wine text-3xl"
            >
              {title}
            </h2>
            <button
              type="button"
              aria-label="Close preview"
              className="dialog-close"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </div>
          {children}
          <button
            type="button"
            className="bg-brand-wine hover:bg-brand-wine-dark mt-7 rounded-xl px-6 py-3 text-sm font-medium text-white"
            onClick={() => dialog.current?.close()}
          >
            Back to exploring
          </button>
        </div>
      </dialog>
    </>
  );
}

export function AvailabilityButton({
  children,
  className = "",
  href = "/signup",
}: {
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

const themeStyles = {
  "Classic Indian": "bg-[#581628] text-[#FAF6F2]",
  "Minimal Elegant": "bg-[#EFE9E0] text-[#4A4744]",
  "Modern Celebration": "bg-[#303B35] text-[#FAF6F0]",
} as const;

export function ThemePreviewButton({
  theme,
}: {
  theme: keyof typeof themeStyles;
}) {
  return (
    <PreviewDialog
      label={
        <>
          <span>
            Preview theme<span className="sr-only">: {theme}</span>
          </span>
          <span aria-hidden="true">→</span>
        </>
      }
      className="flex w-full items-center justify-between rounded-xl border border-[#E9DDD0] bg-[#FAF4ED] px-4 py-2.5 text-xs font-medium text-gray-800 transition-colors hover:bg-[#F3E9DF]"
      title={theme}
    >
      <div
        className={`rounded-2xl px-6 py-10 text-center ${themeStyles[theme]}`}
      >
        <p className="text-xs tracking-widest uppercase">
          Together with our families
        </p>
        <p className="font-editorial my-6 text-5xl">
          Saman <span className="italic">&amp; Hasan</span>
        </p>
        <p className="text-sm">14 February 2027 · Dehradun</p>
        <div className="mx-auto my-6 h-px w-16 bg-current opacity-30" />
        <p className="font-editorial text-2xl italic">
          A lifetime of love. A celebration with you.
        </p>
      </div>
      <p className="mt-4 text-xs leading-6 text-gray-600">
        Sample theme preview. Website customisation and publishing are coming
        later.
      </p>
    </PreviewDialog>
  );
}
