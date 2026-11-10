import Link from "next/link";
import { notFound } from "next/navigation";
import { Comments, EditableDescription, EditableTitle, TicketActions, TicketFields } from "@/components/ticket-detail";
import { Avatar, TypeIcon } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, ticketKey, timeAgo } from "@/lib/format";
import { getActiveUsers, getProject } from "@/lib/queries";

const fieldNames: Record<string, string> = {
  title: "title",
  description: "description",
  type: "type",
  priority: "priority",
  statusId: "status",
  assigneeId: "assignee",
  dueDate: "due date",
  labels: "labels",
};

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; number: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ key, number }, { tab }] = await Promise.all([params, searchParams]);
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();

  const [user, project, users] = await Promise.all([requireUser(), getProject(key), getActiveUsers()]);
  const ticket = await db.ticket.findUnique({
    where: { projectId_number: { projectId: project.id, number: n } },
    include: {
      status: true,
      reporter: true,
      watchers: true,
      comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      activity: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!ticket) notFound();

  // Opening a ticket clears its notifications for the viewer.
  await db.notification.updateMany({ where: { userId: user.id, ticketId: ticket.id, read: false }, data: { read: true } });

  const showHistory = tab === "history";
  const base = `/projects/${project.key}/tickets/${ticket.number}`;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 p-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-6">
        <div>
          <p className="mb-1 flex items-center gap-2 text-sm text-slate-500">
            <Link href={`/projects/${project.key}/board`} className="hover:underline">{project.name}</Link>
            <span>/</span>
            <TypeIcon type={ticket.type} />
            <span className="font-mono">{ticketKey(project.key, ticket.number)}</span>
          </p>
          <EditableTitle ticketId={ticket.id} title={ticket.title} />
        </div>
        <section>
          <h2 className="label">Description</h2>
          <EditableDescription ticketId={ticket.id} description={ticket.description} />
        </section>
        <section>
          <div className="mb-4 flex gap-4 border-b border-slate-200">
            <Link href={base} className={`-mb-px border-b-2 pb-2 text-sm ${!showHistory ? "border-brand-600 font-medium" : "border-transparent text-slate-500"}`}>
              Comments ({ticket.comments.length})
            </Link>
            <Link href={`${base}?tab=history`} className={`-mb-px border-b-2 pb-2 text-sm ${showHistory ? "border-brand-600 font-medium" : "border-transparent text-slate-500"}`}>
              History ({ticket.activity.length})
            </Link>
          </div>
          {showHistory ? (
            <ul className="space-y-3">
              {ticket.activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <Avatar name={a.actor.name} size="sm" />
                  <p className="flex-1">
                    <span className="font-medium">{a.actor.name}</span>{" "}
                    {a.field === "created" ? (
                      "created this ticket"
                    ) : a.field === "description" ? (
                      "updated the description"
                    ) : (
                      <>
                        changed {fieldNames[a.field] ?? a.field} from <span className="rounded bg-slate-100 px-1">{a.oldValue}</span> to{" "}
                        <span className="rounded bg-slate-100 px-1">{a.newValue}</span>
                      </>
                    )}
                    <span className="ml-2 text-xs text-slate-400" title={a.createdAt.toISOString()}>{timeAgo(a.createdAt)}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Comments ticketId={ticket.id} comments={ticket.comments} currentUserId={user.id} isAdmin={user.role === "ADMIN"} />
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <div className="card p-4">
          <TicketFields
            ticketId={ticket.id}
            statusId={ticket.statusId}
            statusCategory={ticket.status.category}
            statuses={project.statuses.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
            assigneeId={ticket.assigneeId}
            users={users}
            priority={ticket.priority}
            type={ticket.type}
            dueDate={ticket.dueDate}
            labels={ticket.labels}
          />
        </div>
        <dl className="space-y-2 px-1 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Reporter</dt>
            <dd className="flex items-center gap-1.5"><Avatar name={ticket.reporter.name} size="sm" />{ticket.reporter.name}</dd>
          </div>
          <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd>{formatDate(ticket.createdAt)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Updated</dt><dd>{timeAgo(ticket.updatedAt)}</dd></div>
          {ticket.completedAt && <div className="flex justify-between"><dt className="text-slate-500">Completed</dt><dd>{formatDate(ticket.completedAt)}</dd></div>}
        </dl>
        <TicketActions ticketId={ticket.id} watching={ticket.watchers.some((w) => w.userId === user.id)} watcherCount={ticket.watchers.length} />
      </aside>
    </div>
  );
}
