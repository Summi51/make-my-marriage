import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { listEvents } from "@/modules/events/use-cases";
import { listVendors } from "@/modules/vendors/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { VendorsPageClient } from "@/app/_components/wedding/vendors-page-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Vendors — Make My Marriage" };

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; add?: string }>;
}) {
  await connection();
  const { tab, add } = await searchParams;
  if (!tab) return null;
  const user = await currentUser(tab);
  if (!user)
    redirect(
      `/login?next=/account/wedding/vendors&tab=${encodeURIComponent(tab)}`,
    );
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership)
    redirect(`/account?tab=${encodeURIComponent(tab)}`);
  const weddingId = String(wedding._id);
  const [vendors, events] = await Promise.all([
    listVendors(weddingId, { page: 1, limit: 100 }),
    listEvents(weddingId, { includeArchived: false }),
  ]);
  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <VendorsPageClient
        initialVendors={vendors.data}
        initialTotal={vendors.pagination.total}
        events={events.map((event) => ({ id: event.id, name: event.name }))}
        location={
          wedding.location?.city ?? wedding.location?.formattedAddress ?? ""
        }
        weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
        openAdd={add === "1"}
      />
    </WorkspaceChrome>
  );
}
