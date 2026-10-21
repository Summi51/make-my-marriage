"use client";

import { useState } from "react";
import { CHAT_QUESTIONS } from "./help-answers";

export function ZealoopQuestions() {
  const [copied, setCopied] = useState("");

  async function copyQuestion(question: string) {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(question);
    } catch {
      setCopied("");
    }
  }

  return (
    <section
      aria-label="Questions to ask in chat"
      className="rounded-3xl border border-[#E8DDD1] bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-brand-wine text-[11px] font-bold tracking-[0.16em] uppercase">
        Ask in chat
      </p>
      <h2 className="font-editorial mt-2 text-3xl text-gray-900">
        Questions worth asking in chat
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Tap a question to copy it, then paste it into the chat button in the
        bottom-right corner. These are planning questions. The cards below
        answer different ones.
      </p>
      <ul className="mt-5 grid gap-2">
        {CHAT_QUESTIONS.map((item) => (
          <li key={item}>
            <button
              type="button"
              className="border-brand-border bg-brand-cream-light hover:border-brand-wine hover:bg-brand-cream flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium text-gray-800"
              onClick={() => void copyQuestion(item)}
            >
              <span>{item}</span>
              <span className="text-brand-wine shrink-0 text-xs font-semibold">
                {copied === item ? "Copied" : "Copy"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
