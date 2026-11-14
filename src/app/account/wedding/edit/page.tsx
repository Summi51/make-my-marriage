import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import {
  getMembershipContext,
  toWeddingDto,
} from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "../../../_components/wedding/workspace-chrome";
import { EditForm } from "../../../_components/wedding/edit-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit wedding details — Make My Marriage" };

export default async function EditWeddingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();
  const { tab } = await searchParams;
  if (!tab) return null;
  const user = await currentUser(tab);
  if (!user)
    redirect(
      `/login?next=/account/wedding/edit${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`,
    );
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding)
    redirect(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  const details = toWeddingDto(wedding);
  return (
    <WorkspaceChrome
      member={{
        name: user.name,
        role: membership?.role,
      }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] lg:py-10">
        {/* ── Left: Form card ── */}
        <section className="rounded-[28px] border border-[#ebe5df] bg-white p-6 shadow-[0_1px_2px_rgba(30,26,31,0.04)] sm:p-9">
          {/* Back link */}
          <a
            href="/account"
            className="group mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#867276] transition-colors hover:text-[#6d213c]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M10 3L5 8l5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to wedding overview
          </a>

          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#9a435e] uppercase">
            Wedding details
          </p>
          <h1 className="font-editorial mt-4 text-4xl leading-[1.05] text-[#1e1a1f] sm:text-[52px]">
            Edit your wedding
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#635559]">
            Correct the names, date, location, or description. Saving a new name
            or date updates the wedding address. All workspace members see the
            change.
          </p>

          {/* Edit form */}
          <div className="mt-6">
            <EditForm
              wedding={{
                brideName: details.brideName,
                groomName: details.groomName,
                weddingDate: details.weddingDate,
                location: details.location.formattedAddress ?? "",
                title: details.title ?? "",
                description: details.description ?? "",
                timeZone: details.timeZone,
                slug: details.website.slug,
              }}
            />
          </div>
        </section>

        {/* ── Right: Sidebar (exactly same design as create page) ── */}
        <aside className="space-y-5">
          {/* Arch card — identical structure to create page */}
          <div className="rounded-[28px] border border-[#ebe5df] bg-[#f7f1eb] px-7 py-8 text-center">
            <ArchMark />
            <p className="mt-7 text-[11px] font-semibold tracking-[0.16em] text-[#9a435e] uppercase">
              Bismillah • Dedicated workspace
            </p>
            <h2 className="font-editorial mt-3 text-[34px] leading-tight text-[#1e1a1f]">
              A blessed, accurate beginning
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#635559]">
              Keep your Nikah date, Walima venue, and family details up to date
              so every member of your workspace sees the same blessed picture.
            </p>
            <p className="mt-6 flex items-center justify-between border-t border-[#e6ddd6] pt-4 text-[12px] text-[#867276]">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[#6d213c]"
                />
                Made for your Nikah &amp; Walima
              </span>
              <span className="italic">Changes saved with care</span>
            </p>
          </div>

          {/* Rings card — identical structure to create page */}
          <div className="flex gap-4 rounded-3xl border border-[#ebe5df] bg-white p-5">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f6f1ec] text-[#6d213c]"
            >
              <RingsIcon />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#1e1a1f]">
                Updates reflect for your whole family
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-[#635559]">
                Every Admin and Manager in your workspace will see the corrected
                details instantly — no manual sharing needed.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </WorkspaceChrome>
  );
}

function ArchMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 150"
      className="mx-auto h-36 w-40 text-[#8d3d58]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <path d="M28 138V78a52 52 0 0 1 104 0v60" />
      <path d="M46 138V82a34 34 0 0 1 68 0v56" strokeDasharray="2 4" />
      <path d="M80 30v108" strokeDasharray="2 4" />
      <path d="M46 82h68" strokeDasharray="2 4" />
      <circle cx="80" cy="82" r="7" />
      <circle cx="80" cy="82" r="2" fill="currentColor" stroke="none" />
      <circle cx="80" cy="24" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="9" cy="13" r="5" />
      <circle cx="15" cy="11" r="5" />
    </svg>
  );
}
