import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { GuestForm } from "@/app/_components/wedding/guest-form";
import { listEvents } from "@/modules/events/use-cases";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add guest — Make My Marriage" };

export default async function NewGuestPage({
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
      `/login?next=/account/wedding/guests/new${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  }

  const events = await listEvents(String(wedding._id), {
    includeArchived: false,
  });

  const weddingTitle = `${wedding.brideName} & ${wedding.groomName}`;

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={weddingTitle}
      weddingDate={wedding.weddingDate}
    >
      <GuestForm
        events={events}
        weddingTitle={weddingTitle}
        timeZone={wedding.timeZone}
      />
    </WorkspaceChrome>
  );
}
