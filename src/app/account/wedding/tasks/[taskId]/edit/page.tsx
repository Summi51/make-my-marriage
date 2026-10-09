import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext, listMembers } from "@/modules/wedding/use-cases";
import { getTask } from "@/modules/tasks/use-cases";
import { listEvents } from "@/modules/events/use-cases";
import { WeddingError } from "@/modules/wedding/errors";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { TaskForm } from "@/app/_components/wedding/task-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit task — Make My Marriage" };

export default async function EditTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();
  const { taskId } = await params;
  const { tab } = await searchParams;
  if (!tab) return null;
  const user = await currentUser(tab);
  if (!user) {
    redirect(
      `/login?next=/account/wedding/tasks/${encodeURIComponent(taskId)}/edit&tab=${encodeURIComponent(tab)}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account?tab=${encodeURIComponent(tab)}`);
  }

  const task = await loadTask(String(wedding._id), taskId);
  if (!task) notFound();

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
        task={task}
        initialMembers={initialMembers}
        initialEvents={initialEvents}
      />
    </WorkspaceChrome>
  );
}

async function loadTask(weddingId: string, taskId: string) {
  try {
    return await getTask(weddingId, taskId);
  } catch (error) {
    if (error instanceof WeddingError && error.status === 404) return null;
    throw error;
  }
}
