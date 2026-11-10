import Link from "next/link";
import type { TicketListItem } from "@/lib/queries";
import { formatDate, isOverdue, ticketKey } from "@/lib/format";
import { Avatar, Label, PriorityBadge, TypeIcon } from "./ui";

export function TicketCard({ ticket, dragging }: { ticket: TicketListItem; dragging?: boolean }) {
  const overdue = isOverdue(ticket.dueDate, ticket.status.category);
  const key = ticketKey(ticket.project.key, ticket.number);
  return (
    <div className={`card p-3 text-sm ${dragging ? "rotate-1 shadow-lg ring-2 ring-brand-500" : "hover:border-slate-300"}`}>
      <Link href={`/projects/${ticket.project.key}/tickets/${ticket.number}`} className="mb-2 block font-medium leading-snug hover:text-brand-700" draggable={false}>
        {ticket.title}
      </Link>
      {ticket.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {ticket.labels.map((l) => <Label key={l}>{l}</Label>)}
        </div>
      )}
      <div className="flex items-center gap-2">
        <TypeIcon type={ticket.type} />
        <span className={`font-mono text-[11px] text-slate-500 ${ticket.status.category === "DONE" ? "line-through" : ""}`}>{key}</span>
        <PriorityBadge priority={ticket.priority} />
        {ticket.dueDate && (
          <span className={`text-[11px] ${overdue ? "font-semibold text-red-600" : "text-slate-500"}`} title="Due date">
            {formatDate(ticket.dueDate).replace(/, \d{4}$/, "")}
          </span>
        )}
        {ticket._count.comments > 0 && <span className="text-[11px] text-slate-400" title="Comments">💬 {ticket._count.comments}</span>}
        <span className="ml-auto">
          <Avatar name={ticket.assignee?.name} size="sm" />
        </span>
      </div>
    </div>
  );
}
