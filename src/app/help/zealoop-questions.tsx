"use client";

import { useState } from "react";
import { STARTER_QUESTIONS } from "./help-answers";

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
      aria-label="Questions to ask Zealoop"
      className="space-y-4 rounded-3xl border border-[#EAE1D7] bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="font-editorial text-3xl text-gray-900">
        Ask Zealoop these
      </h2>
      <p className="text-sm leading-relaxed text-gray-600">
        Tap a question to copy it, then paste it into the dark Zealoop button in
        the bottom-right corner. The written answers are on this page. Zealoop
        can reply only after those answers are saved in its dashboard.
      </p>
      <ul className="flex flex-wrap gap-2">
        {STARTER_QUESTIONS.map((item) => (
          <li key={item}>
            <button
              type="button"
              className="border-brand-border bg-brand-cream hover:border-brand-wine rounded-full border px-3 py-1.5 text-left text-xs font-medium text-gray-800"
              onClick={() => void copyQuestion(item)}
            >
              {copied === item ? "Copied — paste in Zealoop" : item}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
