import { Board } from "@/components/board";
import { FilterBar } from "@/components/filter-bar";
import { NewTicketButton } from "@/components/new-ticket";
import { db } from "@/lib/db";
import { type Filters, filterWhere, getActiveUsers, getProject, projectLabels, ticketListInclude } from "@/lib/queries";

const DONE_WINDOW_DAYS = 14;

export default async function BoardPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Filters> }) {
  const [{ key }, filters] = await Promise.all([params, searchParams]);
  const project = await getProject(key);
  const columns = project.statuses.filter((s) => s.category !== "BACKLOG");
  const doneSince = new Date(Date.now() - DONE_WINDOW_DAYS * 86_400_000);

  const [tickets, users, labels] = await Promise.all([
    db.ticket.findMany({
      where: {
        AND: [
          filterWhere(project.id, filters),
          { statusId: { in: columns.map((c) => c.id) } },
          { OR: [{ status: { category: { not: "DONE" } } }, { completedAt: null }, { completedAt: { gte: doneSince } }] },
        ],
      },
      include: ticketListInclude,
      orderBy: { rank: "asc" },
    }),
    getActiveUsers(),
    projectLabels(project.id),
  ]);

  const statusOptions = project.statuses.map((s) => ({ id: s.id, name: s.name, category: s.category }));

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <FilterBar users={users} labels={labels}>
        <span className="text-xs text-slate-400">Done column shows the last {DONE_WINDOW_DAYS} days</span>
      </FilterBar>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <Board
          columns={columns.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
          tickets={tickets}
          footer={Object.fromEntries(
            columns.map((c) => [
              c.id,
              <NewTicketButton key={c.id} projectId={project.id} projectKey={project.key} statuses={statusOptions} users={users} defaultStatusId={c.id} label="Add ticket" variant="ghost" />,
            ]),
          )}
        />
      </div>
    </div>
  );
}
