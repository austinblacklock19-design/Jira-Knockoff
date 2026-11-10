import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { db } from "./db";

export const ticketListInclude = {
  status: true,
  assignee: { select: { id: true, name: true } },
  project: { select: { key: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketInclude;

export type TicketListItem = Prisma.TicketGetPayload<{ include: typeof ticketListInclude }>;

export async function getProject(key: string) {
  const project = await db.project.findUnique({
    where: { key: key.toUpperCase() },
    include: { statuses: { orderBy: { order: "asc" } }, team: true },
  });
  if (!project) notFound();
  return project;
}

export async function getActiveUsers() {
  return db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } });
}

export type Filters = { q?: string; assignee?: string; priority?: string; label?: string; type?: string };

export function filterWhere(projectId: string, f: Filters): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = { projectId };
  if (f.q) {
    const n = Number(f.q.replace(/^[A-Za-z0-9]+-/, ""));
    where.OR = [
      { title: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
      ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
    ];
  }
  if (f.assignee === "none") where.assigneeId = null;
  else if (f.assignee) where.assigneeId = f.assignee;
  if (f.priority) where.priority = f.priority as Prisma.TicketWhereInput["priority"];
  if (f.type) where.type = f.type as Prisma.TicketWhereInput["type"];
  if (f.label) where.labels = { has: f.label.toLowerCase() };
  return where;
}

export async function projectLabels(projectId: string) {
  const rows = await db.ticket.findMany({ where: { projectId }, select: { labels: true } });
  return Array.from(new Set(rows.flatMap((r) => r.labels))).sort();
}
