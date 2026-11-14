import type { Metadata } from "next";
import { PublicGuideShell } from "../_components/homepage/public-guide-shell";

export const metadata: Metadata = {
  title: "How it works — Make My Marriage",
  description:
    "From your first wedding plan to your shared memories: a guide for couples, family members and guests.",
};
const journey = [
  ["01", "Create", "Names, date, city and timezone."],
  ["02", "Invite family", "Admins and Managers plan together."],
  ["03", "Add ceremonies", "Mehendi, Baraat, Walima and the rest."],
  ["04", "Invite guests", "Each guest gets one private RSVP link."],
  ["05", "Publish", "Website, livestream and Guest QR."],
  ["06", "Celebrate", "Photos come back into one gallery."],
] as const;

const rooms = [
  ["Events", "Every ceremony, with its date, venue and dress note."],
  ["Tasks", "Who in the family is doing what, and by when."],
  ["Guests", "One invitation per guest. A family can share that one link."],
  ["Invitations & RSVP", "Pending, accepted and declined, by celebration."],
  ["Expenses", "Advances and part payments already given, in rupees."],
  ["My Vendors", "Phone, notes and a meeting link you already have."],
  ["Wedding Website", "A public page for the story, schedule and livestream."],
  ["Gallery", "A private album guests open from a link or QR."],
] as const;

export default function HowItWorksPage() {
  return (
    <PublicGuideShell>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-20">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#946950] uppercase">
            How it works
          </p>
          <h1 className="font-editorial text-brand-wine mt-5 text-4xl leading-tight sm:text-6xl">
            One wedding. Two kinds of people.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-600">
            Family who plan sign in. Guests never do. Everything else hangs from
            that one difference.
          </p>
        </header>

        <section
          aria-label="Who uses Make My Marriage"
          className="mt-12 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
        >
          <article className="rounded-3xl border border-[#E8DDD1] bg-white p-7">
            <p className="text-brand-wine text-xs font-bold tracking-[0.16em] uppercase">
              Planning family
            </p>
            <h2 className="font-editorial mt-3 text-3xl">Signs in</h2>
            <p className="mt-3 leading-relaxed text-gray-600">
              Admins invite parents and siblings as Admins or Managers. They
              share Events, Tasks, Guests, Expenses and My Vendors.
            </p>
          </article>
          <div className="hidden items-center justify-center px-2 text-xs font-bold tracking-[0.16em] text-[#946950] uppercase md:flex">
            and
          </div>
          <article className="bg-brand-wine rounded-3xl p-7 text-white">
            <p className="text-xs font-bold tracking-[0.16em] text-white/70 uppercase">
              Wedding guests
            </p>
            <h2 className="font-editorial mt-3 text-3xl">Open a link</h2>
            <p className="mt-3 leading-relaxed text-white/85">
              One private link for the invitation and RSVP. One QR for photos.
              No account, and no view of the planning workspace.
            </p>
          </article>
        </section>

        <section aria-label="The wedding journey" className="mt-16">
          <h2 className="font-editorial text-3xl text-gray-900 sm:text-4xl">
            The path from the first detail to the last photo
          </h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {journey.map(([number, title, detail]) => (
              <li
                key={number}
                className="rounded-3xl border border-[#E8DDD1] bg-white p-6"
              >
                <span className="text-brand-wine text-sm font-bold">
                  {number}
                </span>
                <h3 className="font-editorial mt-3 text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="What lives in the workspace" className="mt-16">
          <h2 className="font-editorial text-3xl text-gray-900 sm:text-4xl">
            What the workspace holds
          </h2>
          <p className="mt-3 max-w-2xl text-gray-600">
            Each piece has its own screen. Nothing here sends money, books a
            vendor, or turns on a camera.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rooms.map(([name, detail]) => (
              <li
                key={name}
                className="rounded-2xl border border-[#E8DDD1] bg-white p-5"
              >
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {detail}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-brand-wine mt-16 rounded-3xl p-8 text-white sm:p-12">
          <h2 className="font-editorial text-3xl">
            Guests only ever see three things
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Invitation", "Their events, venue and a private RSVP."],
              ["Website", "The published story, schedule and livestream."],
              ["Photo QR", "A private album, if you allow uploads."],
            ].map(([title, detail], index) => (
              <li key={title}>
                <p className="text-sm font-bold text-white/70">0{index + 1}</p>
                <h3 className="font-editorial mt-2 text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/85">
                  {detail}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </PublicGuideShell>
  );
}
