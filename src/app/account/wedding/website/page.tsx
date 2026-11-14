import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import {
  getMembershipContext,
  getWeddingWebsite,
} from "@/modules/wedding/use-cases";
import { listEvents } from "@/modules/events/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { WebsiteManagerClient } from "@/app/_components/wedding/website-manager-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wedding Website — Make My Marriage" };

export default async function WeddingWebsitePage({
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
      `/login?next=/account/wedding/website${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  }

  const weddingId = String(wedding._id);
  const website = await getWeddingWebsite(weddingId);
  const events = await listEvents(weddingId, { includeArchived: false });

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={
        wedding.title || `${wedding.brideName} & ${wedding.groomName}`
      }
      weddingDate={wedding.weddingDate}
    >
      <WebsiteManagerClient
        tabId={tab}
        wedding={{
          id: weddingId,
          brideName: wedding.brideName,
          groomName: wedding.groomName,
          title: wedding.title || `${wedding.brideName} & ${wedding.groomName}`,
          description: wedding.description ?? null,
          weddingDate: wedding.weddingDate,
          timeZone: wedding.timeZone,
          location: wedding.location?.formattedAddress || "",
          galleryEnabled: wedding.gallery?.isEnabled ?? false,
          livestreamEnabled: wedding.livestream?.isEnabled ?? false,
          livestreamUrl: wedding.livestream?.youtubeUrl ?? null,
        }}
        initialWebsite={website}
        events={events.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type ?? null,
          startsAt: e.startsAt,
          endsAt: e.endsAt ?? null,
          venueName: e.venueName ?? null,
          address: e.address ?? null,
          description: e.description ?? null,
          dressCode: e.dressCode ?? null,
        }))}
      />
    </WorkspaceChrome>
  );
}
