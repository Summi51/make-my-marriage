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
        <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <header className="max-w-xl lg:sticky lg:top-28">
            <p className="text-brand-wine mb-4 inline-flex items-center gap-2 rounded-full bg-[#EFE8E1] px-3.5 py-1.5 text-[11.5px] font-semibold tracking-wider uppercase">
              <span className="bg-brand-wine inline-block h-1.5 w-1.5 rounded-full" />
              Help
            </p>
            <h1 className="font-editorial text-4xl leading-[1.08] text-gray-900 sm:text-5xl">
              Answers for the wedding you are planning
            </h1>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Open a card for a written answer, or ask the chat button in the
              bottom-right corner. Keep passwords, bank details and private
              invitation links out of the chat.
            </p>
          </header>
          <ZealoopQuestions />
        </div>
        <section
          aria-label="Written answers"
          className="mx-auto mt-12 max-w-6xl"
        >
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#946950] uppercase">
                Written answers
              </p>
              <h2 className="font-editorial mt-1 text-3xl text-gray-900">
                A few things couples ask first
              </h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {HELP_ANSWERS.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-[#E8DDD1] bg-white px-5 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none py-4 font-semibold text-gray-900 marker:content-none">
                  <span className="flex items-start justify-between gap-4">
                    {item.question}
                    <span
                      aria-hidden="true"
                      className="text-brand-wine mt-0.5 text-lg leading-none group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="max-w-3xl pb-5 text-sm leading-relaxed text-gray-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </PublicGuideShell>
  );
}
