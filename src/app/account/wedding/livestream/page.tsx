import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import {
  getMembershipContext,
  getWeddingLivestream,
  getWeddingWebsite,
} from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { LivestreamManagerClient } from "@/app/_components/wedding/livestream-manager-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Livestream — Make My Marriage" };

export default async function LivestreamPage({
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
      `/login?next=/account/wedding/livestream&tab=${encodeURIComponent(tab)}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account?tab=${encodeURIComponent(tab)}`);
  }

  const weddingId = String(wedding._id);
  const [livestream, website] = await Promise.all([
    getWeddingLivestream(weddingId),
    getWeddingWebsite(weddingId),
  ]);

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={
        wedding.title || `${wedding.brideName} & ${wedding.groomName}`
      }
      weddingDate={wedding.weddingDate}
    >
      <LivestreamManagerClient
        tabId={tab}
        initial={livestream}
        websitePublished={website.isPublished}
        websiteSlug={website.slug}
        weddingTitle={
          wedding.title || `${wedding.brideName} & ${wedding.groomName}`
        }
        brideName={wedding.brideName}
        groomName={wedding.groomName}
        weddingDate={wedding.weddingDate}
      />
    </WorkspaceChrome>
  );
}
