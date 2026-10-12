import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { EventsPageClient } from "@/app/_components/wedding/events-page-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wedding events — Make My Marriage" };

export default async function EventsPage({
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
      `/login?next=/account/wedding/events${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`,
    );
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership)
    redirect(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <EventsPageClient
        timeZone={wedding.timeZone}
        coupleNames={`${wedding.brideName} & ${wedding.groomName}`}
        location={wedding.location?.formattedAddress}
      />
    </WorkspaceChrome>
  );
}
