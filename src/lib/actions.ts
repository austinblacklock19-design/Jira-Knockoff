"use server";

import type { Priority, StatusCategory, TicketType, User } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import { db } from "./db";
import { CATEGORIES, PRIORITIES, TYPES, formatDate, priorityLabel, rankBetween, ticketKey, typeLabel } from "./format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireEditor() {
  const user = await requireUser();
  if (user.role === "VIEWER") throw new Error("Viewers cannot make changes.");
  return user;
}

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function parseDate(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLabels(v: string) {
  return Array.from(
    new Set(
      v
        .split(",")
        .map((l) => l.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

function refresh(projectKey?: string) {
  if (projectKey) revalidatePath(`/projects/${projectKey}`, "layout");
  revalidatePath("/my-work");
}

async function notify(userIds: (string | null | undefined)[], actor: User, ticketId: string, type: string, message: string) {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id) && id !== actor.id)));
  if (ids.length === 0) return;
  await db.notification.createMany({ data: ids.map((userId) => ({ userId, ticketId, type, message })) });
}

async function watch(userId: string | null | undefined, ticketId: string) {
  if (!userId) return;
  await db.watcher.upsert({
    where: { userId_ticketId: { userId, ticketId } },
    update: {},
    create: { userId, ticketId },
  });
}

// ---------------------------------------------------------------------------
// Teams and projects
// ---------------------------------------------------------------------------

export async function createTeam(fd: FormData) {
  const user = await requireEditor();
  const name = str(fd, "name");
  if (!name) throw new Error("Team name is required.");
  await db.team.create({ data: { name, members: { create: { userId: user.id, role: "LEAD" } } } });
  revalidatePath("/teams");
}

export async function addTeamMember(fd: FormData) {
  await requireEditor();
  const teamId = str(fd, "teamId");
  const userId = str(fd, "userId");
  if (!teamId || !userId) return;
  await db.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    update: {},
    create: { teamId, userId },
  });
  revalidatePath("/teams");
}

export async function removeTeamMember(fd: FormData) {
  await requireEditor();
  await db.teamMember.delete({
    where: { teamId_userId: { teamId: str(fd, "teamId"), userId: str(fd, "userId") } },
  });
  revalidatePath("/teams");
}

const DEFAULT_STATUSES: { name: string; category: StatusCategory; color: string }[] = [
  { name: "Backlog", category: "BACKLOG", color: "#94a3b8" },
  { name: "To Do", category: "TODO", color: "#64748b" },
  { name: "In Progress", category: "IN_PROGRESS", color: "#3b6ef5" },
  { name: "In Review", category: "IN_PROGRESS", color: "#8b5cf6" },
  { name: "Done", category: "DONE", color: "#16a34a" },
];

export type FormState = { error?: string } | undefined;

export async function createProject(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireEditor();
  const name = str(fd, "name");
  const key = str(fd, "key").toUpperCase();
  const teamId = str(fd, "teamId");
  const description = str(fd, "description") || null;
  if (!name || !teamId) return { error: "Name and team are required." };
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(key)) return { error: "Key must be 2 to 10 letters or numbers, starting with a letter." };
  if (await db.project.findUnique({ where: { key } })) return { error: `The key ${key} is already in use.` };
  await db.project.create({
    data: {
      name,
      key,
      teamId,
      description,
      statuses: { create: DEFAULT_STATUSES.map((s, order) => ({ ...s, order })) },
    },
  });
  revalidatePath("/", "layout");
  redirect(`/projects/${key}/board`);
}

export async function updateProject(fd: FormData) {
  await requireEditor();
  const id = str(fd, "projectId");
  const project = await db.project.update({
    where: { id },
    data: { name: str(fd, "name"), description: str(fd, "description") || null },
  });
  revalidatePath("/", "layout");
  refresh(project.key);
}

// ---------------------------------------------------------------------------
// Board columns (statuses)
// ---------------------------------------------------------------------------

export async function addStatus(fd: FormData) {
  await requireEditor();
  const projectId = str(fd, "projectId");
  const name = str(fd, "name");
  const category = str(fd, "category") as StatusCategory;
  if (!name || !CATEGORIES.includes(category)) return;
  const last = await db.status.findFirst({ where: { projectId }, orderBy: { order: "desc" } });
  const s = await db.status.create({
    data: { projectId, name, category, color: str(fd, "color") || "#64748b", order: (last?.order ?? -1) + 1 },
    include: { project: true },
  });
  refresh(s.project.key);
}

export async function updateStatus(fd: FormData) {
  await requireEditor();
  const category = str(fd, "category") as StatusCategory;
  const s = await db.status.update({
    where: { id: str(fd, "statusId") },
    data: {
      name: str(fd, "name"),
      color: str(fd, "color") || undefined,
      category: CATEGORIES.includes(category) ? category : undefined,
    },
    include: { project: true },
  });
  refresh(s.project.key);
}

export async function moveStatus(statusId: string, direction: -1 | 1) {
  await requireEditor();
  const s = await db.status.findUniqueOrThrow({ where: { id: statusId }, include: { project: true } });
  const all = await db.status.findMany({ where: { projectId: s.projectId }, orderBy: { order: "asc" } });
  const i = all.findIndex((x) => x.id === statusId);
  const j = i + direction;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j]!, all[i]!];
  await db.$transaction(all.map((x, order) => db.status.update({ where: { id: x.id }, data: { order } })));
  refresh(s.project.key);
}

export async function deleteStatus(statusId: string) {
  await requireEditor();
  const s = await db.status.findUniqueOrThrow({
    where: { id: statusId },
    include: { project: true, _count: { select: { tickets: true } } },
  });
  if (s._count.tickets > 0) throw new Error("Move the tickets out of this column before deleting it.");
  const remaining = await db.status.count({ where: { projectId: s.projectId } });
  if (remaining <= 1) throw new Error("A project needs at least one column.");
  await db.status.delete({ where: { id: statusId } });
  refresh(s.project.key);
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export async function createTicket(fd: FormData) {
  const user = await requireEditor();
  const projectId = str(fd, "projectId");
  const title = str(fd, "title");
  if (!title) throw new Error("Title is required.");

  const type = (TYPES as string[]).includes(str(fd, "type")) ? (str(fd, "type") as TicketType) : "TASK";
  const priority = (PRIORITIES as string[]).includes(str(fd, "priority")) ? (str(fd, "priority") as Priority) : "MEDIUM";
  const assigneeId = str(fd, "assigneeId") || null;

  const statuses = await db.status.findMany({ where: { projectId }, orderBy: { order: "asc" } });
  const requested = statuses.find((s) => s.id === str(fd, "statusId"));
  const status = requested ?? statuses.find((s) => s.category === "TODO") ?? statuses[0];
  if (!status) throw new Error("This project has no columns.");

  const ticket = await db.$transaction(async (tx) => {
    const project = await tx.project.update({ where: { id: projectId }, data: { ticketSeq: { increment: 1 } } });
    const last = await tx.ticket.findFirst({ where: { statusId: status.id }, orderBy: { rank: "desc" } });
    const t = await tx.ticket.create({
      data: {
        projectId,
        number: project.ticketSeq,
        title,
        description: str(fd, "description"),
        type,
        priority,
        statusId: status.id,
        assigneeId,
        reporterId: user.id,
        dueDate: parseDate(str(fd, "dueDate")),
        labels: parseLabels(str(fd, "labels")),
        rank: rankBetween(last?.rank ?? null, null),
        completedAt: status.category === "DONE" ? new Date() : null,
      },
      include: { project: true },
    });
    await tx.activityEvent.create({ data: { ticketId: t.id, actorId: user.id, field: "created", newValue: t.title } });
    return t;
  });

  await watch(user.id, ticket.id);
  await watch(assigneeId, ticket.id);
  const key = ticketKey(ticket.project.key, ticket.number);
  await notify([assigneeId], user, ticket.id, "assigned", `${user.name} assigned you ${key}: ${ticket.title}`);
  refresh(ticket.project.key);
  return { key, number: ticket.number };
}

export type TicketField = "title" | "description" | "type" | "priority" | "statusId" | "assigneeId" | "dueDate" | "labels";

export async function updateTicket(ticketId: string, field: TicketField, raw: string | null) {
  const user = await requireEditor();
  const ticket = await db.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { project: true, status: true, assignee: true, watchers: true },
  });
  const key = ticketKey(ticket.project.key, ticket.number);
  const value = raw?.trim() ?? "";

  let data: Record<string, unknown> = {};
  let oldValue: string | null = null;
  let newValue: string | null = null;

  switch (field) {
    case "title":
      if (!value) throw new Error("Title cannot be empty.");
      data = { title: value };
      oldValue = ticket.title;
      newValue = value;
      break;
    case "description":
      data = { description: raw ?? "" };
      oldValue = null;
      newValue = null;
      break;
    case "type":
      if (!(TYPES as string[]).includes(value)) return;
      data = { type: value };
      oldValue = typeLabel[ticket.type];
      newValue = typeLabel[value as TicketType];
      break;
    case "priority":
      if (!(PRIORITIES as string[]).includes(value)) return;
      data = { priority: value };
      oldValue = priorityLabel[ticket.priority];
      newValue = priorityLabel[value as Priority];
      break;
    case "statusId": {
      const status = await db.status.findFirst({ where: { id: value, projectId: ticket.projectId } });
      if (!status) return;
      const last = await db.ticket.findFirst({ where: { statusId: status.id }, orderBy: { rank: "desc" } });
      data = {
        statusId: status.id,
        rank: rankBetween(last?.rank ?? null, null),
        completedAt: status.category === "DONE" ? (ticket.completedAt ?? new Date()) : null,
      };
      oldValue = ticket.status.name;
      newValue = status.name;
      break;
    }
    case "assigneeId": {
      const assignee = value ? await db.user.findUnique({ where: { id: value } }) : null;
      data = { assigneeId: assignee?.id ?? null };
      oldValue = ticket.assignee?.name ?? "Unassigned";
      newValue = assignee?.name ?? "Unassigned";
      break;
    }
    case "dueDate": {
      const d = parseDate(value);
      data = { dueDate: d };
      oldValue = ticket.dueDate ? formatDate(ticket.dueDate) : "None";
      newValue = d ? formatDate(d) : "None";
      break;
    }
    case "labels": {
      const labels = parseLabels(value);
      data = { labels };
      oldValue = ticket.labels.join(", ") || "None";
      newValue = labels.join(", ") || "None";
      break;
    }
    default:
      return;
  }

  if (field !== "description" && oldValue === newValue) return;

  await db.$transaction([
    db.ticket.update({ where: { id: ticketId }, data }),
    db.activityEvent.create({ data: { ticketId, actorId: user.id, field, oldValue, newValue } }),
  ]);

  await watch(user.id, ticketId);
  if (field === "assigneeId" && data.assigneeId) {
    const assigneeId = data.assigneeId as string;
    await watch(assigneeId, ticketId);
    await notify([assigneeId], user, ticketId, "assigned", `${user.name} assigned you ${key}: ${ticket.title}`);
  } else if (field === "statusId") {
    await notify(
      ticket.watchers.map((w) => w.userId),
      user,
      ticketId,
      "status",
      `${user.name} moved ${key} to ${newValue}`,
    );
  }
  refresh(ticket.project.key);
}

/**
 * Moves a ticket to a column and position. `beforeId` is the ticket that should
 * sit directly above it, `afterId` the one directly below (either may be null).
 */
export async function moveTicket(ticketId: string, statusId: string, beforeId: string | null, afterId: string | null) {
  const user = await requireEditor();
  const ticket = await db.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { project: true, status: true, watchers: true },
  });
  const status = await db.status.findFirst({ where: { id: statusId, projectId: ticket.projectId } });
  if (!status) return;

  const [before, after] = await Promise.all([
    beforeId ? db.ticket.findUnique({ where: { id: beforeId } }) : null,
    afterId ? db.ticket.findUnique({ where: { id: afterId } }) : null,
  ]);
  const rank = rankBetween(before?.rank ?? null, after?.rank ?? null);
  const statusChanged = status.id !== ticket.statusId;

  await db.$transaction([
    db.ticket.update({
      where: { id: ticketId },
      data: {
        statusId: status.id,
        rank,
        completedAt: status.category === "DONE" ? (ticket.completedAt ?? new Date()) : null,
      },
    }),
    ...(statusChanged
      ? [
          db.activityEvent.create({
            data: { ticketId, actorId: user.id, field: "statusId", oldValue: ticket.status.name, newValue: status.name },
          }),
        ]
      : []),
  ]);

  if (statusChanged) {
    const key = ticketKey(ticket.project.key, ticket.number);
    await notify(ticket.watchers.map((w) => w.userId), user, ticketId, "status", `${user.name} moved ${key} to ${status.name}`);
  }
  refresh(ticket.project.key);
}

export async function deleteTicket(ticketId: string) {
  await requireEditor();
  const ticket = await db.ticket.delete({ where: { id: ticketId }, include: { project: true } });
  refresh(ticket.project.key);
  redirect(`/projects/${ticket.project.key}/board`);
}

export async function toggleWatch(ticketId: string) {
  const user = await requireUser();
  const existing = await db.watcher.findUnique({ where: { userId_ticketId: { userId: user.id, ticketId } } });
  if (existing) await db.watcher.delete({ where: { userId_ticketId: { userId: user.id, ticketId } } });
  else await db.watcher.create({ data: { userId: user.id, ticketId } });
  const t = await db.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: { project: true } });
  refresh(t.project.key);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/** Finds users mentioned as @handle, where handle is the part of their email before the @. */
async function mentionedUsers(body: string) {
  const handles = Array.from(body.matchAll(/(^|\s)@([a-zA-Z0-9._-]+)/g), (m) => m[2]!.toLowerCase());
  if (handles.length === 0) return [];
  const users = await db.user.findMany({ where: { active: true } });
  return users.filter((u) => handles.includes(u.email.split("@")[0]!.toLowerCase()));
}

export async function addComment(ticketId: string, body: string) {
  const user = await requireEditor();
  const text = body.trim();
  if (!text) return;
  const ticket = await db.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { project: true, watchers: true },
  });
  await db.comment.create({ data: { ticketId, authorId: user.id, body: text } });
  const key = ticketKey(ticket.project.key, ticket.number);

  const mentioned = await mentionedUsers(text);
  for (const m of mentioned) await watch(m.id, ticketId);
  await notify(mentioned.map((m) => m.id), user, ticketId, "mention", `${user.name} mentioned you on ${key}`);
  const mentionedIds = new Set(mentioned.map((m) => m.id));
  await notify(
    ticket.watchers.map((w) => w.userId).filter((id) => !mentionedIds.has(id)),
    user,
    ticketId,
    "comment",
    `${user.name} commented on ${key}`,
  );
  await watch(user.id, ticketId);
  refresh(ticket.project.key);
}

export async function editComment(commentId: string, body: string) {
  const user = await requireEditor();
  const comment = await db.comment.findUniqueOrThrow({ where: { id: commentId }, include: { ticket: { include: { project: true } } } });
  if (comment.authorId !== user.id) throw new Error("You can only edit your own comments.");
  if (!body.trim()) return;
  await db.comment.update({ where: { id: commentId }, data: { body: body.trim() } });
  refresh(comment.ticket.project.key);
}

export async function deleteComment(commentId: string) {
  const user = await requireEditor();
  const comment = await db.comment.findUniqueOrThrow({ where: { id: commentId }, include: { ticket: { include: { project: true } } } });
  if (comment.authorId !== user.id && user.role !== "ADMIN") throw new Error("You can only delete your own comments.");
  await db.comment.delete({ where: { id: commentId } });
  refresh(comment.ticket.project.key);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}
