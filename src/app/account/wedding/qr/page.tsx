import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { GuestQrClient } from "@/app/_components/wedding/guest-qr-client";
export const dynamic = "force-dynamic";
export const metadata = { title: "Guest QR — Make My Marriage" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();
  const { tab } = await searchParams;
  if (!tab) return null;
  const user = await currentUser(tab);
  if (!user)
    redirect(`/login?next=/account/wedding/qr&tab=${encodeURIComponent(tab)}`);
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership)
    redirect(`/account?tab=${encodeURIComponent(tab)}`);
  const title = `${wedding.brideName} & ${wedding.groomName}`;
  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={title}
      weddingDate={wedding.weddingDate}
    >
      <GuestQrClient title={title} tabId={tab} />
    </WorkspaceChrome>
  );
}
