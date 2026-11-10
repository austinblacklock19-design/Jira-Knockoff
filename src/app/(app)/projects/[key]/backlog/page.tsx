import { Backlog } from "@/components/backlog";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { type Filters, filterWhere, getActiveUsers, getProject, projectLabels, ticketListInclude } from "@/lib/queries";

export default async function BacklogPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Filters> }) {
  const [{ key }, filters] = await Promise.all([params, searchParams]);
  const project = await getProject(key);
  const backlogStatuses = project.statuses.filter((s) => s.category === "BACKLOG");
  const boardStatus = project.statuses.find((s) => s.category === "TODO") ?? project.statuses.find((s) => s.category !== "BACKLOG");

  if (backlogStatuses.length === 0) {
    return (
      <div className="p-6">
        <EmptyState title="This project has no backlog column">Add a column with the “Backlog” category in Settings to use the backlog.</EmptyState>
      </div>
    );
  }

  const [tickets, users, labels] = await Promise.all([
    db.ticket.findMany({
      where: { AND: [filterWhere(project.id, filters), { statusId: { in: backlogStatuses.map((s) => s.id) } }] },
      include: ticketListInclude,
      orderBy: { rank: "asc" },
    }),
    getActiveUsers(),
    projectLabels(project.id),
  ]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <FilterBar users={users} labels={labels}>
        <span className="text-xs text-slate-500">{tickets.length} tickets · drag to set priority order</span>
      </FilterBar>
      <Backlog
        projectId={project.id}
        backlogStatusId={backlogStatuses[0]!.id}
        boardStatusId={boardStatus?.id ?? null}
        boardStatusName={boardStatus?.name ?? null}
        tickets={tickets}
        canReorder={!filtered}
      />
      {filtered && <p className="text-xs text-slate-500">Clear filters to reorder the backlog.</p>}
    </div>
  );
}
