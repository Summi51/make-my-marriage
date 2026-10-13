import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { getEvent } from "@/modules/events/use-cases";
import { WeddingError } from "@/modules/wedding/errors";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { EventForm } from "@/app/_components/wedding/event-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit event — Make My Marriage" };

export default async function EditEventPage({
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
      `/login?next=/account/wedding/events/${encodeURIComponent(eventId)}/edit&tab=${encodeURIComponent(tab)}`,
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
      {event.archivedAt ? (
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
          <h1 className="font-editorial text-4xl text-[#1e1a1f]">
            This event is archived.
          </h1>
          <p className="mt-3 text-sm text-[#676169]">
            Archived events are read-only. Restore the event from its details
            page to edit it again.
          </p>
          <Link
            href={`/account/wedding/events/${event.id}?tab=${encodeURIComponent(tab)}`}
            className="mt-6 inline-flex rounded-lg border border-[#e6dfdf] px-4 py-2 text-xs font-semibold text-[#6d213c]"
          >
            View details
          </Link>
        </div>
      ) : (
        <EventForm timeZone={wedding.timeZone} event={event} />
      )}
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
