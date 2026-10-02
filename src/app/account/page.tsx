import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import {
  getMembershipContext,
  toWeddingDto,
} from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "../_components/wedding/workspace-chrome";
import { SetupForm } from "../_components/wedding/setup-form";
import { WeddingHome } from "../_components/wedding/wedding-home";

export const dynamic = "force-dynamic";

const accountContext = cache(async () => {
  const user = await currentUser();
  if (!user) return { user: null, wedding: null };
  const { wedding } = await getMembershipContext(user.id);
  return { user, wedding };
});

export async function generateMetadata() {
  const { user, wedding } = await accountContext();
  if (!user) return { title: "Your account — Make My Marriage" };
  return {
    title: wedding
      ? `${wedding.brideName} & ${wedding.groomName} — Make My Marriage`
      : "Create your wedding — Make My Marriage",
  };
}

export default async function AccountPage() {
  await connection();
  const { user, wedding } = await accountContext();
  if (!user) redirect("/login");
  if (!wedding) {
    return (
      <WorkspaceChrome>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] lg:py-10">
          <section className="rounded-[28px] border border-[#ebe5df] bg-white p-6 shadow-[0_1px_2px_rgba(30,26,31,0.04)] sm:p-9">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#9a435e] uppercase">
              Nikah & Wedding Setup
            </p>
            <h1 className="font-editorial mt-4 text-4xl leading-[1.05] text-[#1e1a1f] sm:text-[52px]">
              Let’s bring your wedding to life
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#635559]">
              Fill in the essential details to establish your dedicated
              planning workspace for your Nikah, Walima, and family
              celebrations.
            </p>
            <div className="mt-8">
              <SetupForm />
            </div>
          </section>
          <aside className="space-y-5">
            <div className="rounded-[28px] border border-[#ebe5df] bg-[#f7f1eb] px-7 py-8 text-center">
              <ArchMark />
              <p className="mt-7 text-[11px] font-semibold tracking-[0.16em] text-[#9a435e] uppercase">
                Bismillah • Dedicated workspace
              </p>
              <h2 className="font-editorial mt-3 text-[34px] leading-tight text-[#1e1a1f]">
                A blessed, organized beginning
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#635559]">
                Bring your Nikah date, Walima venue, family traditions, and
                guest lists together into one quiet, dignified home for your
                celebration.
              </p>
              <p className="mt-6 flex items-center justify-between border-t border-[#e6ddd6] pt-4 text-[12px] text-[#867276]">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-[#6d213c]"
                  />
                  Made for your Nikah & Walima
                </span>
                <span className="italic">Mubarak on your beginning</span>
              </p>
            </div>
            <div className="flex gap-4 rounded-3xl border border-[#ebe5df] bg-white p-5">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f6f1ec] text-[#6d213c]"
              >
                <RingsIcon />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-[#1e1a1f]">
                  Barakah in the details, peace of mind for family
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-[#635559]">
                  You’ll be the Admin of this wedding. Invite your elders,
                  co-planner, and close family to manage events, guests, and
                  preparations with ease.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </WorkspaceChrome>
    );
  }
  return (
    <WorkspaceChrome>
      <WeddingHome wedding={toWeddingDto(wedding)} />
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
