import type { Priority, StatusCategory, TicketType } from "@prisma/client";

export const PRIORITIES: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
export const TYPES: TicketType[] = ["TASK", "BUG", "STORY"];
export const CATEGORIES: StatusCategory[] = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

export const priorityLabel: Record<Priority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const priorityClass: Record<Priority, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
};

export const typeLabel: Record<TicketType, string> = { TASK: "Task", BUG: "Bug", STORY: "Story" };
export const typeIcon: Record<TicketType, string> = { TASK: "✓", BUG: "●", STORY: "◆" };
export const typeClass: Record<TicketType, string> = {
  TASK: "bg-sky-500",
  BUG: "bg-red-500",
  STORY: "bg-emerald-500",
};

export const categoryLabel: Record<StatusCategory, string> = {
  BACKLOG: "Backlog",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export function ticketKey(projectKey: string, number: number) {
  return `${projectKey}-${number}`;
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function isOverdue(d: Date | string | null | undefined, category?: StatusCategory) {
  if (!d || category === "DONE") return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return new Date(d) < today;
}

export function timeAgo(d: Date | string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Midpoint rank between two neighbours, used for drag-and-drop ordering. */
export function rankBetween(before: number | null, after: number | null) {
  if (before == null && after == null) return 1000;
  if (before == null) return after! - 1000;
  if (after == null) return before + 1000;
  return (before + after) / 2;
}
