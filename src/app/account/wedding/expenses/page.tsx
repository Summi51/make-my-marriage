import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WorkspaceChrome } from "@/app/_components/wedding/workspace-chrome";
import { listEvents } from "@/modules/events/use-cases";
import { listExpenses, getExpenseSummary } from "@/modules/expenses/use-cases";
import { ExpensesPageClient } from "@/app/_components/wedding/expenses-page-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wedding Expenses — Make My Marriage" };

export default async function ExpensesPage({
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
      `/login?next=/account/wedding/expenses${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`,
    );
  }
  const { wedding, membership } = await getMembershipContext(user.id);
  if (!wedding || !membership) {
    redirect(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  }

  const weddingId = String(wedding._id);
  const [initialExpensesResult, initialSummary, events] = await Promise.all([
    listExpenses(weddingId, { page: 1, limit: 100 }),
    getExpenseSummary(weddingId),
    listEvents(weddingId, { includeArchived: false }),
  ]);

  return (
    <WorkspaceChrome
      member={{ name: user.name, role: membership.role }}
      weddingTitle={`${wedding.brideName} & ${wedding.groomName}`}
      weddingDate={wedding.weddingDate}
    >
      <ExpensesPageClient
        wedding={{
          id: weddingId,
          title: wedding.title || `${wedding.brideName} & ${wedding.groomName}`,
          brideName: wedding.brideName,
          groomName: wedding.groomName,
          weddingDate: wedding.weddingDate
            ? new Date(wedding.weddingDate).toISOString().slice(0, 10)
            : null,
        }}
        initialExpenses={initialExpensesResult.data}
        initialTotal={initialExpensesResult.pagination.total}
        initialSummary={initialSummary}
        events={events.map((e) => ({
          id: e.id,
          name: e.name,
        }))}
      />
    </WorkspaceChrome>
  );
}
