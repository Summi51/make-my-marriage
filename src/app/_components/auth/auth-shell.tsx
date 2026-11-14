import Link from "next/link";
import Image from "next/image";
import { BrandWordmark } from "../homepage/logo";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fbf8f7] text-[#1e1a1f]">
      <main className="flex min-h-[calc(100svh-60px)] w-full flex-1 flex-col lg:flex-row">
        <div className="flex w-full flex-col justify-between bg-[#fffbfa] px-8 py-10 sm:px-14 lg:w-[48%] lg:px-20 lg:py-16 xl:w-[46%] xl:px-24">
          <header>
            <Link
              href="/"
              className="inline-flex items-center"
              aria-label="Make My Marriage home"
            >
              <BrandWordmark />
            </Link>
          </header>
          <div className="mx-auto my-auto w-full max-w-md py-10 lg:mx-0 lg:py-6">
            {children}
          </div>
          <p className="pt-4 text-center text-[11px] text-[#635559]/80 lg:text-left">
            Your plans, your people. A beautiful beginning.
          </p>
        </div>
        <div className="relative flex min-h-[460px] w-full flex-col justify-end overflow-hidden p-8 sm:p-12 lg:w-[52%] lg:p-16 xl:w-[54%]">
          <Image
            src="/images/wedding.jpg"
            alt="A couple laughing with family during a joyful wedding celebration"
            fill
            priority
            sizes="(min-width: 1280px) 54vw, (min-width: 1024px) 52vw, 100vw"
            className="scale-[1.02] object-cover object-center brightness-[0.92] saturate-[1.05]"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/15" />
          <div className="pointer-events-none absolute inset-0 bg-[#500926]/15 mix-blend-multiply" />
          <div className="relative z-10 max-w-xl space-y-4 text-white">
            <div className="inline-flex items-center gap-2">
              <span className="h-px w-4 bg-white/70" />
              <span className="font-sans text-[11px] font-semibold tracking-[0.22em] text-white/90 uppercase sm:text-xs">
                Made for your happily ever after
              </span>
            </div>
            <h2 className="font-editorial text-[38px] leading-[1.08] font-normal tracking-tight text-white drop-shadow-sm sm:text-[46px] lg:text-[54px]">
              A little less planning.
              <br />A lot more celebrating.
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-white/85 drop-shadow-sm sm:text-base">
              One beautiful place for the people, moments, and traditions that
              matter most.
            </p>
            <p className="flex items-center gap-3 pt-2 text-xs tracking-wide text-white/70">
              <span aria-hidden="true">✧</span> Saman &amp; Hasan’s Nikah •
              Lahore
            </p>
          </div>
        </div>
      </main>
      <footer className="flex flex-col items-center justify-between gap-3 border-t border-[#e4d6d9]/30 px-6 py-4 text-xs text-[#635559] sm:flex-row lg:px-12">
        <p>
          © {new Date().getFullYear()} Make My Marriage. Celebrations
          orchestrated with care.
        </p>
        <Link href="/" className="hover:text-[#500926]">
          Back to home
        </Link>
      </footer>
    </div>
  );
}
