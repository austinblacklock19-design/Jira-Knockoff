import type { Priority, TicketType } from "@prisma/client";
import { initials, priorityClass, priorityLabel, typeClass, typeIcon, typeLabel } from "@/lib/format";

const avatarColors = ["bg-sky-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600"];

export function Avatar({ name, size = "md" }: { name?: string | null; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  if (!name) {
    return (
      <span title="Unassigned" className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400`}>
        ?
      </span>
    );
  }
  const color = avatarColors[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];
  return (
    <span title={name} className={`${dims} ${color} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}>
      {initials(name)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${priorityClass[priority]}`}>{priorityLabel[priority]}</span>;
}

export function TypeIcon({ type }: { type: TicketType }) {
  return (
    <span title={typeLabel[type]} className={`${typeClass[type]} inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[9px] text-white`}>
      {typeIcon[type]}
    </span>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{children}</span>;
}

export function StatusPill({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: color }}>
      {name}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  );
}
