import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { MembersPageClient } from "@/app/_components/wedding/members-page-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wedding members — Make My Marriage" };

export default async function MembersPage({
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
      `/login?next=/account/wedding/members${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`,
    );
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership)
    redirect(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  const member = { name: user.name, role: membership.role };
  return (
    <WorkspaceChrome member={member}>
      {membership.role === "ADMIN" ? (
        <MembersPageClient currentUserId={user.id} />
      ) : (
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f6f1ec] text-2xl text-[#5c1a33]">
            ♡
          </div>
          <h1 className="font-editorial mt-6 text-4xl text-[#1e1a1f]">
            Only an Admin can manage wedding members.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#635559]">
            Ask a wedding Admin if someone needs to be invited.
          </p>
          <Link
            href={`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`}
            className="mt-7 inline-flex h-11 items-center rounded-xl border border-[#d8d0c7] bg-white px-5 text-sm font-semibold text-[#5c1a33] hover:bg-[#f6f1ec]"
          >
            Back to wedding
          </Link>
        </div>
      )}
    </WorkspaceChrome>
  );
}
