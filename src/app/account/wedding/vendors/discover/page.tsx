import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { VendorsDiscoveryClient } from "@/app/_components/wedding/vendors-discovery-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discover Vendors — Make My Marriage" };
export default async function DiscoverVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string }>;
}) {
  await connection();
  const { tab, category } = await searchParams;
  if (!tab) return null;
  const user = await currentUser(tab);
  if (!user)
    redirect(
      `/login?next=/account/wedding/vendors/discover&tab=${encodeURIComponent(tab)}`,
    );
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership)
    redirect(`/account?tab=${encodeURIComponent(tab)}`);
  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <VendorsDiscoveryClient
        initialLocation={
          wedding.location?.city ?? wedding.location?.formattedAddress ?? ""
        }
        initialCategory={category}
      />
    </WorkspaceChrome>
  );
}
