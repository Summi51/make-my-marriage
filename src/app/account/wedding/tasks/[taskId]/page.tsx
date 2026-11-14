import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { getTask } from "@/modules/tasks/use-cases";
import { WeddingError } from "@/modules/wedding/errors";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { TaskDetail } from "@/app/_components/wedding/task-detail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Task Details — Make My Marriage" };

export default async function TaskDetailPage({
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
      `/login?next=/account/wedding/tasks/${encodeURIComponent(taskId)}&tab=${encodeURIComponent(tab)}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account?tab=${encodeURIComponent(tab)}`);
  }

  const task = await loadTask(String(wedding._id), taskId);
  if (!task) notFound();

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <TaskDetail task={task} timeZone={wedding.timeZone} />
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
