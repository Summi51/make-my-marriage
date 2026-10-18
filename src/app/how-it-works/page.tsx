import type { Metadata } from "next";
import Link from "next/link";
import { PublicGuideShell } from "../_components/homepage/public-guide-shell";

export const metadata: Metadata = {
  title: "How it works — Make My Marriage",
  description:
    "From your first wedding plan to your shared memories: a guide for couples, family members and guests.",
};
const steps = [
  [
    "Start with your celebration",
    "Create an account and set up your wedding details: names, date, location and timezone. Already invited by family? Accept their invitation instead of creating a separate wedding.",
  ],
  [
    "Bring your people together",
    "An Admin invites trusted family members from Wedding Members. Recipients sign in using the invited email and accept. Admins manage membership; Managers help with everyday planning.",
  ],
  [
    "Give every detail a home",
    "Add ceremonies in Events, then organise Tasks. Keep guest details in Guests and use Invitations & RSVP to track responses. Member invitations and guest invitations serve different purposes.",
  ],
  [
    "Keep vendors and spending organised",
    "Save contacts in My Vendors and explore Discover Vendors. Record amounts already paid in Expenses, choosing advance, part payment or full payment. Recording an expense does not transfer money or book a vendor.",
  ],
  [
    "Share your wedding story",
    "Prepare your Wedding Website and review it before publishing. Copy links from your live site—not localhost—so guests can open them on their devices. Configure Livestream separately if you have a supported stream.",
  ],
  [
    "Collect the memories",
    "Upload photos to Gallery and share your Guest QR or private album link. Guests do not need an account for the shared album. Use sharing controls to allow viewing and uploads; keep the private link out of public posts.",
  ],
];

export default function HowItWorksPage() {
  return (
    <PublicGuideShell>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-20">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#946950] uppercase">
            A little guidance. A beautiful beginning.
          </p>
          <h1 className="font-editorial text-brand-wine mt-5 text-4xl leading-tight sm:text-6xl">
            Your wedding, one thoughtful step at a time.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-600">
            One shared workspace for the couple and their planning team. Simple
            links for guests. Here is how everything fits together.
          </p>
        </header>
        <ol className="my-12 grid gap-5 md:grid-cols-2">
          {steps.map(([title, description], index) => (
            <li
              key={title}
              className="border-brand-border rounded-3xl border bg-white p-7 sm:p-9"
            >
              <span className="text-brand-wine mb-5 flex size-11 items-center justify-center rounded-full bg-[#f5e9ed] text-sm font-bold">
                0{index + 1}
              </span>
              <h2 className="font-editorial text-3xl">{title}</h2>
              <p className="mt-4 leading-relaxed text-gray-600">
                {description}
              </p>
            </li>
          ))}
        </ol>
        <section className="rounded-3xl bg-[#6b1b34] p-8 text-white sm:p-12">
          <h2 className="font-editorial text-3xl">
            You do not have to figure it out alone.
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-white/85">
            Browse free answers about the tools, privacy and sharing. Our help
            guide explains the product; it does not access your private wedding
            records.
          </p>
          <Link
            href="/help"
            className="mt-6 inline-flex min-h-11 rounded-xl bg-white px-6 py-3 font-semibold text-[#6b1b34] hover:bg-[#f5e9ed]"
          >
            Explore Help & FAQs →
          </Link>
        </section>
      </main>
    </PublicGuideShell>
  );
}
