import type { Metadata } from "next";
import { HELP_ANSWERS } from "./help-answers";
import { PublicGuideShell } from "../_components/homepage/public-guide-shell";
import { ZealoopQuestions } from "./zealoop-questions";

export const metadata: Metadata = {
  title: "Help — Make My Marriage",
  referrer: "no-referrer",
};

export default function HelpPage() {
  return (
    <PublicGuideShell>
      <main className="px-4 py-12 text-[#34262c] sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <header className="lg:sticky lg:top-28">
            <p className="text-brand-wine mb-4 inline-flex items-center gap-2 rounded-full bg-[#EFE8E1] px-3.5 py-1.5 text-[11.5px] font-semibold tracking-wider uppercase">
              <span className="bg-brand-wine inline-block h-1.5 w-1.5 rounded-full" />
              Help desk
            </p>
            <h1 className="font-editorial text-4xl leading-[1.08] text-gray-900 sm:text-5xl">
              A little help with your planning
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
              Use the dark Zealoop chat button in the bottom-right corner, or
              open a written answer below. Do not share private wedding details.
            </p>
          </header>
          <ZealoopQuestions />
        </div>
        <section
          aria-label="Frequently asked questions"
          className="mx-auto mt-10 grid max-w-6xl gap-3 sm:grid-cols-2"
        >
          {HELP_ANSWERS.map((item) => (
            <details
              key={item.question}
              className="rounded-2xl border border-[#EAE1D7] bg-white px-5 py-1"
            >
              <summary className="cursor-pointer py-4 font-semibold text-gray-900">
                {item.question}
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-gray-600">
                {item.answer}
              </p>
            </details>
          ))}
        </section>
      </main>
    </PublicGuideShell>
  );
}
