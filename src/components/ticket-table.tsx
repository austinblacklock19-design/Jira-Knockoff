"use client";

import type { Priority } from "@prisma/client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { type TicketField, updateTicket } from "@/lib/actions";
import { PRIORITIES, isOverdue, priorityClass, priorityLabel, ticketKey, toDateInput } from "@/lib/format";
import type { TicketListItem } from "@/lib/queries";
import { TypeIcon } from "./ui";

type Status = { id: string; name: string; color: string; category: string };
type GroupBy = "status" | "assignee" | "priority";

const priorityColors: Record<Priority, string> = { URGENT: "#dc2626", HIGH: "#ea580c", MEDIUM: "#d97706", LOW: "#94a3b8" };

export function TicketTable({ tickets, statuses, users, groupBy }: { tickets: TicketListItem[]; statuses: Status[]; users: { id: string; name: string }[]; groupBy: GroupBy }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  let groups: { id: string; name: string; color: string; items: TicketListItem[] }[];
  if (groupBy === "assignee") {
    groups = [
      ...users.map((u) => ({ id: u.id, name: u.name, color: "#3b6ef5", items: tickets.filter((t) => t.assigneeId === u.id) })),
      { id: "none", name: "Unassigned", color: "#94a3b8", items: tickets.filter((t) => !t.assigneeId) },
    ].filter((g) => g.items.length > 0);
  } else if (groupBy === "priority") {
    groups = PRIORITIES.map((p) => ({ id: p, name: priorityLabel[p], color: priorityColors[p], items: tickets.filter((t) => t.priority === p) }));
  } else {
    groups = statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, items: tickets.filter((t) => t.statusId === s.id) }));
  }

  function setGroup(g: string) {
    const next = new URLSearchParams(params.toString());
    if (g === "status") next.delete("group");
    else next.set("group", g);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Group by</span>
        {(["status", "assignee", "priority"] as const).map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={`btn px-2 py-1 capitalize ${groupBy === g ? "bg-brand-50 text-brand-700" : "btn-ghost"}`}>
            {g}
          </button>
        ))}
      </div>
      {groups.map((g) => {
        const isCollapsed = collapsed.has(g.id);
        return (
          <section key={g.id}>
            <button
              className="mb-1 flex items-center gap-2 text-sm font-semibold"
              style={{ color: g.color }}
              onClick={() =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(g.id)) next.delete(g.id);
                  else next.add(g.id);
                  return next;
                })
              }
            >
              <span className={`inline-block transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>▾</span>
              {g.name}
              <span className="font-normal text-slate-400">{g.items.length} tickets</span>
            </button>
            {!isCollapsed && (
              <div className="card overflow-x-auto" style={{ borderLeft: `4px solid ${g.color}` }}>
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="w-24 px-3 py-2 font-medium">Key</th>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="w-40 px-3 py-2 text-center font-medium">Status</th>
                      <th className="w-44 px-3 py-2 font-medium">Assignee</th>
                      <th className="w-28 px-3 py-2 text-center font-medium">Priority</th>
                      <th className="w-36 px-3 py-2 font-medium">Due</th>
                      <th className="w-44 px-3 py-2 font-medium">Labels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((t) => (
                      <Row key={t.id} ticket={t} statuses={statuses} users={users} />
                    ))}
                    {g.items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 text-center text-xs text-slate-400">No tickets</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Row({ ticket, statuses, users }: { ticket: TicketListItem; statuses: Status[]; users: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState<Partial<Record<TicketField, string>>>({});

  const value = (f: TicketField, fallback: string) => local[f] ?? fallback;

  function save(field: TicketField, v: string) {
    setLocal((p) => ({ ...p, [field]: v }));
    startTransition(async () => {
      await updateTicket(ticket.id, field, v);
      router.refresh();
      setLocal((p) => {
        const next = { ...p };
        delete next[field];
        return next;
      });
    });
  }

  const statusId = value("statusId", ticket.statusId);
  const status = statuses.find((s) => s.id === statusId) ?? ticket.status;
  const priority = value("priority", ticket.priority) as Priority;
  const due = value("dueDate", toDateInput(ticket.dueDate));
  const overdue = isOverdue(due || null, status.category as never);
  const cell = "border-r border-slate-100 px-3 py-1.5";
  const bare = "w-full bg-transparent outline-none focus:ring-2 focus:ring-brand-100 rounded px-1 py-0.5";

  return (
    <tr className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${pending ? "opacity-70" : ""}`}>
      <td className={cell}>
        <Link href={`/projects/${ticket.project.key}/tickets/${ticket.number}`} className="flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-brand-700">
          <TypeIcon type={ticket.type} />
          {ticketKey(ticket.project.key, ticket.number)}
        </Link>
      </td>
      <td className={cell}>
        <input
          aria-label="Title"
          className={bare}
          defaultValue={ticket.title}
          key={ticket.title}
          onBlur={(e) => e.target.value.trim() && e.target.value !== ticket.title && save("title", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </td>
      <td className="border-r border-slate-100 p-0">
        <select
          aria-label="Status"
          value={statusId}
          onChange={(e) => save("statusId", e.target.value)}
          className="h-full w-full cursor-pointer appearance-none px-2 py-2 text-center text-xs font-medium text-white outline-none"
          style={{ backgroundColor: status.color }}
        >
          {statuses.map((s) => <option key={s.id} value={s.id} className="bg-white text-slate-900">{s.name}</option>)}
        </select>
      </td>
      <td className={cell}>
        <select aria-label="Assignee" className={bare} value={value("assigneeId", ticket.assigneeId ?? "")} onChange={(e) => save("assigneeId", e.target.value)}>
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </td>
      <td className="border-r border-slate-100 p-0">
        <select aria-label="Priority" value={priority} onChange={(e) => save("priority", e.target.value)} className={`h-full w-full cursor-pointer appearance-none px-2 py-2 text-center text-xs font-medium outline-none ${priorityClass[priority]}`}>
          {PRIORITIES.map((p) => <option key={p} value={p} className="bg-white text-slate-900">{priorityLabel[p]}</option>)}
        </select>
      </td>
      <td className={cell}>
        <input aria-label="Due date" type="date" className={`${bare} ${overdue ? "font-semibold text-red-600" : ""}`} value={due} onChange={(e) => save("dueDate", e.target.value)} />
      </td>
      <td className={cell}>
        <input
          aria-label="Labels"
          className={bare}
          defaultValue={ticket.labels.join(", ")}
          key={ticket.labels.join(",")}
          placeholder="—"
          onBlur={(e) => e.target.value !== ticket.labels.join(", ") && save("labels", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </td>
    </tr>
  );
}
