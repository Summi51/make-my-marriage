import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { listEvents } from "@/modules/events/use-cases";
import { InvitationsPageClient } from "@/app/_components/wedding/invitations-page-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invitations & RSVP — Make My Marriage" };

export default async function InvitationsPage({
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
      `/login?next=/account/wedding/invitations${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  }

  const events = await listEvents(String(wedding._id), {
    includeArchived: false,
  });

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <InvitationsPageClient
        wedding={{
          id: String(wedding._id),
          title: wedding.title || `${wedding.brideName} & ${wedding.groomName}`,
          brideName: wedding.brideName,
          groomName: wedding.groomName,
          weddingDate: wedding.weddingDate
            ? new Date(wedding.weddingDate).toISOString().slice(0, 10)
            : null,
          timeZone: wedding.timeZone || "Asia/Kolkata",
          location:
            wedding.location?.formattedAddress ||
            wedding.location?.city ||
            "Our Celebration Venue",
        }}
        events={events.map((event) => ({
          id: event.id,
          name: event.name,
          type: event.type ?? null,
          startsAt: event.startsAt ?? null,
          venueName: event.venueName ?? null,
        }))}
      />
    </WorkspaceChrome>
  );
}
