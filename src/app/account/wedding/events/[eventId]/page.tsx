import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { getEvent } from "@/modules/events/use-cases";
import { WeddingError } from "@/modules/wedding/errors";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { EventDetail } from "@/app/_components/wedding/event-detail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Event — Make My Marriage" };

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const { tab } = await searchParams;
  if (!tab) return null;
  const user = await currentUser(tab);
  if (!user)
    redirect(
      `/login?next=/account/wedding/events/${encodeURIComponent(eventId)}&tab=${encodeURIComponent(tab)}`,
    );
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership)
    redirect(`/account?tab=${encodeURIComponent(tab)}`);
  const event = await loadEvent(String(wedding._id), eventId);
  if (!event) notFound();
  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <EventDetail event={event} timeZone={wedding.timeZone} />
    </WorkspaceChrome>
  );
}

async function loadEvent(weddingId: string, eventId: string) {
  try {
    return await getEvent(weddingId, eventId);
  } catch (error) {
    if (error instanceof WeddingError && error.status === 404) return null;
    throw error;
  }
}
