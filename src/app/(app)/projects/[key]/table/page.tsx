import { FilterBar } from "@/components/filter-bar";
import { TicketTable } from "@/components/ticket-table";
import { db } from "@/lib/db";
import { type Filters, filterWhere, getActiveUsers, getProject, projectLabels, ticketListInclude } from "@/lib/queries";

export default async function TablePage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Filters & { group?: string }> }) {
  const [{ key }, { group, ...filters }] = await Promise.all([params, searchParams]);
  const project = await getProject(key);
  const [tickets, users, labels] = await Promise.all([
    db.ticket.findMany({ where: filterWhere(project.id, filters), include: ticketListInclude, orderBy: { rank: "asc" } }),
    getActiveUsers(),
    projectLabels(project.id),
  ]);
  const groupBy = group === "assignee" || group === "priority" ? group : "status";

  return (
    <div className="space-y-4 p-6">
      <FilterBar users={users} labels={labels} />
      <TicketTable
        tickets={tickets}
        statuses={project.statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, category: s.category }))}
        users={users}
        groupBy={groupBy}
      />
    </div>
  );
}
