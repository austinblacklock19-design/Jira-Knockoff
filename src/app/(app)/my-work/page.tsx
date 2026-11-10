import Link from "next/link";
import { Label, PriorityBadge, StatusPill, TypeIcon } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, isOverdue, ticketKey, timeAgo } from "@/lib/format";
import { MarkAllRead } from "./mark-all-read";

export default async function MyWorkPage() {
  const user = await requireUser();
  const [tickets, notifications] = await Promise.all([
    db.ticket.findMany({
      where: { assigneeId: user.id, status: { category: { not: "DONE" } }, project: { archived: false } },
      include: { status: true, project: { select: { key: true, name: true } } },
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { ticket: { select: { number: true, project: { select: { key: true } } } } },
    }),
  ]);

  // Overdue first, then by due date (no date last), then priority.
  const prio = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  tickets.sort((a, b) => {
    const ad = a.dueDate?.getTime() ?? Infinity;
    const bd = b.dueDate?.getTime() ?? Infinity;
    return ad - bd || prio[a.priority] - prio[b.priority];
  });
  const overdue = tickets.filter((t) => isOverdue(t.dueDate, t.status.category)).length;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Good to see you, {user.name.split(" ")[0]}</h1>
      <p className="mb-6 text-sm text-slate-500">
        {tickets.length} open {tickets.length === 1 ? "ticket" : "tickets"} assigned to you
        {overdue > 0 && <span className="font-medium text-red-600"> · {overdue} overdue</span>}
      </p>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="card divide-y divide-slate-100">
          {tickets.map((t) => {
            const late = isOverdue(t.dueDate, t.status.category);
            return (
              <Link key={t.id} href={`/projects/${t.project.key}/tickets/${t.number}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                <TypeIcon type={t.type} />
                <span className="w-20 shrink-0 font-mono text-xs text-slate-500">{ticketKey(t.project.key, t.number)}</span>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="hidden gap-1 xl:flex">{t.labels.slice(0, 2).map((l) => <Label key={l}>{l}</Label>)}</span>
                <PriorityBadge priority={t.priority} />
                <StatusPill name={t.status.name} color={t.status.color} />
                <span className={`w-24 text-right text-xs ${late ? "font-semibold text-red-600" : "text-slate-500"}`}>{t.dueDate ? formatDate(t.dueDate) : "No due date"}</span>
              </Link>
            );
          })}
          {tickets.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nothing assigned to you right now.</p>}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Notifications {unread > 0 && <span className="text-sm font-normal text-slate-500">({unread} new)</span>}</h2>
            {unread > 0 && <MarkAllRead />}
          </div>
          <ul className="card divide-y divide-slate-100">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link href={`/projects/${n.ticket.project.key}/tickets/${n.ticket.number}`} className={`block px-4 py-2.5 text-sm hover:bg-slate-50 ${n.read ? "text-slate-500" : "font-medium"}`}>
                  {!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-600" />}
                  {n.message}
                  <span className="block text-xs font-normal text-slate-400">{timeAgo(n.createdAt)}</span>
                </Link>
              </li>
            ))}
            {notifications.length === 0 && <li className="p-6 text-center text-sm text-slate-500">You&apos;re all caught up.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
