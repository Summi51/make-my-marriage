import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { GuestDetail } from "@/app/_components/wedding/guest-detail";
import { getGuest, getGuestInvitationLink } from "@/modules/guests/use-cases";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guest details — Make My Marriage" };

async function loadGuestData(weddingId: string, guestId: string) {
  try {
    const [guest, { url, token }] = await Promise.all([
      getGuest(weddingId, guestId),
      getGuestInvitationLink(weddingId, guestId),
    ]);
    return { guest, url, token };
  } catch {
    return null;
  }
}

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ guestId: string }>;
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

  const { guestId } = await params;
  const data = await loadGuestData(String(wedding._id), guestId);
  if (!data) notFound();

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <GuestDetail
        guest={data.guest}
        invitationUrl={data.url}
        token={data.token}
      />
    </WorkspaceChrome>
  );
}
