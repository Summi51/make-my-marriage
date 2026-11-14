import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext, listMembers } from "@/modules/wedding/use-cases";
import { listEvents } from "@/modules/events/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { TaskForm } from "@/app/_components/wedding/task-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add task — Make My Marriage" };

export default async function NewTaskPage({
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
      `/login?next=/account/wedding/tasks/new&tab=${encodeURIComponent(tab)}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account?tab=${encodeURIComponent(tab)}`);
  }

  const [members, events] = await Promise.all([
    listMembers(String(wedding._id)),
    listEvents(String(wedding._id), {
      includeArchived: false,
    }),
  ]);

  const initialMembers = members.map((m) => ({
    membershipId: m.membershipId,
    name: m.user?.name || "Member",
    role: m.role,
  }));

  const initialEvents = events.map((e) => ({
    id: e.id,
    name: e.name,
  }));

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <TaskForm
        timeZone={wedding.timeZone}
        initialMembers={initialMembers}
        initialEvents={initialEvents}
      />
    </WorkspaceChrome>
  );
}
