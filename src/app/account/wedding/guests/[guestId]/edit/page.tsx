import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { GuestForm } from "@/app/_components/wedding/guest-form";
import { getGuest } from "@/modules/guests/use-cases";
import { listEvents } from "@/modules/events/use-cases";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit guest — Make My Marriage" };

async function loadEditData(weddingId: string, guestId: string) {
  try {
    const [guest, events] = await Promise.all([
      getGuest(weddingId, guestId),
      listEvents(weddingId, { includeArchived: false }),
    ]);

    return { guest, events };
  } catch {
    return null;
  }
}

export default async function EditGuestPage({
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
  const data = await loadEditData(String(wedding._id), guestId);
  if (!data) notFound();

  const weddingTitle = `${wedding.brideName} & ${wedding.groomName}`;

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={weddingTitle}
      weddingDate={wedding.weddingDate}
    >
      <GuestForm
        initialData={data.guest}
        events={data.events}
        weddingTitle={weddingTitle}
        timeZone={wedding.timeZone}
      />
    </WorkspaceChrome>
  );
}
