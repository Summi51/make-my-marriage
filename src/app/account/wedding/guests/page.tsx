import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { GuestsPageClient } from "@/app/_components/wedding/guests-page-client";
import { listEvents } from "@/modules/events/use-cases";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wedding guests — Make My Marriage" };

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();
  const { tab } = await searchParams;
  if (!tab) return null;
  const user = await currentUser(tab);
  if (!user) {
    redirect(
      `/login?next=/account/wedding/guests${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  }

  // Guests are fetched, filtered and paged by the client through /api/guests.
  const events = await listEvents(String(wedding._id), {
    includeArchived: false,
  });

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <GuestsPageClient
        events={events.map((event) => ({ id: event.id, name: event.name }))}
      />
    </WorkspaceChrome>
  );
}
