/**
 * Demo data for local development. Run with `npm run db:seed`.
 * Wipes existing data first, so never run it against production.
 */
import { PrismaClient, type Priority, type StatusCategory, type TicketType } from "@prisma/client";

const db = new PrismaClient();

const STATUSES: { name: string; category: StatusCategory; color: string }[] = [
  { name: "Backlog", category: "BACKLOG", color: "#94a3b8" },
  { name: "To Do", category: "TODO", color: "#64748b" },
  { name: "In Progress", category: "IN_PROGRESS", color: "#3b6ef5" },
  { name: "In Review", category: "IN_PROGRESS", color: "#8b5cf6" },
  { name: "Done", category: "DONE", color: "#16a34a" },
];

const day = 86_400_000;
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
const inDays = (n: number) => new Date(today.getTime() + n * day);

type Seed = [title: string, status: string, type: TicketType, priority: Priority, assignee: number | null, due: number | null, labels: string[]];

const projects: { key: string; name: string; team: string; description: string; tickets: Seed[] }[] = [
  {
    key: "WEB",
    name: "Website Redesign",
    team: "Marketing",
    description: "Refresh the public website ahead of the spring launch.",
    tickets: [
      ["Audit current site analytics", "Done", "TASK", "MEDIUM", 1, -10, ["research"]],
      ["Draft new sitemap", "Done", "TASK", "HIGH", 1, -6, ["ia"]],
      ["Homepage hero design", "In Review", "STORY", "HIGH", 2, 2, ["design"]],
      ["Write copy for About page", "In Progress", "TASK", "MEDIUM", 1, 5, ["copy"]],
      ["Product page template", "In Progress", "STORY", "HIGH", 2, -1, ["design"]],
      ["Contact form sends duplicate emails", "To Do", "BUG", "URGENT", 3, 1, ["bug", "forms"]],
      ["Set up redirects from old URLs", "To Do", "TASK", "MEDIUM", 3, 12, ["seo"]],
      ["Choose stock photography", "To Do", "TASK", "LOW", null, 14, ["design"]],
      ["Accessibility review", "Backlog", "TASK", "HIGH", null, null, ["a11y"]],
      ["Blog migration plan", "Backlog", "STORY", "MEDIUM", null, null, ["content"]],
      ["Newsletter signup widget", "Backlog", "STORY", "LOW", null, null, []],
    ],
  },
  {
    key: "APP",
    name: "Customer Portal",
    team: "Engineering",
    description: "Self-service portal for customers to view orders and invoices.",
    tickets: [
      ["Login with company SSO", "Done", "STORY", "HIGH", 3, -4, ["auth"]],
      ["Orders list page", "In Progress", "STORY", "HIGH", 4, 3, ["frontend"]],
      ["Invoice PDF download", "In Progress", "STORY", "MEDIUM", 3, 7, ["backend"]],
      ["Dates show in wrong time zone", "In Review", "BUG", "HIGH", 4, 0, ["bug"]],
      ["API rate limiting", "To Do", "TASK", "MEDIUM", 3, 10, ["backend"]],
      ["Search orders by PO number", "To Do", "STORY", "MEDIUM", null, 20, ["frontend"]],
      ["Mobile layout for dashboard", "Backlog", "STORY", "LOW", null, null, ["frontend"]],
      ["Email receipts", "Backlog", "STORY", "MEDIUM", null, null, ["backend"]],
    ],
  },
  {
    key: "OPS",
    name: "Office Move",
    team: "Operations",
    description: "Move the main office to the new building by end of quarter.",
    tickets: [
      ["Sign lease for new building", "Done", "TASK", "URGENT", 0, -20, ["legal"]],
      ["Get quotes from movers", "Done", "TASK", "HIGH", 5, -8, ["vendors"]],
      ["Floor plan and seating chart", "In Progress", "TASK", "HIGH", 5, 4, ["planning"]],
      ["Order new desks and chairs", "To Do", "TASK", "MEDIUM", 5, -2, ["purchasing"]],
      ["Internet and phone install", "To Do", "TASK", "HIGH", 4, 9, ["it"]],
      ["Notify clients of new address", "Backlog", "TASK", "MEDIUM", null, null, ["comms"]],
    ],
  },
];

const users = [
  { name: "Alex Morgan", email: "alex.morgan@example.com", role: "ADMIN" as const },
  { name: "Jordan Lee", email: "jordan.lee@example.com", role: "MEMBER" as const },
  { name: "Priya Shah", email: "priya.shah@example.com", role: "MEMBER" as const },
  { name: "Sam Rivera", email: "sam.rivera@example.com", role: "MEMBER" as const },
  { name: "Chris Park", email: "chris.park@example.com", role: "MEMBER" as const },
  { name: "Taylor Brooks", email: "taylor.brooks@example.com", role: "MEMBER" as const },
  { name: "Morgan Diaz", email: "morgan.diaz@example.com", role: "VIEWER" as const },
];

async function main() {
  await db.$transaction([
    db.notification.deleteMany(),
    db.watcher.deleteMany(),
    db.activityEvent.deleteMany(),
    db.comment.deleteMany(),
    db.ticket.deleteMany(),
    db.status.deleteMany(),
    db.project.deleteMany(),
    db.teamMember.deleteMany(),
    db.team.deleteMany(),
    db.user.deleteMany(),
  ]);

  const u = await Promise.all(users.map((data) => db.user.create({ data })));

  const teamMembers: Record<string, number[]> = { Marketing: [0, 1, 2, 3], Engineering: [0, 3, 4], Operations: [0, 4, 5] };
  const teams: Record<string, string> = {};
  for (const [name, idx] of Object.entries(teamMembers)) {
    const t = await db.team.create({
      data: { name, members: { create: idx.map((i, n) => ({ userId: u[i]!.id, role: n === 1 ? ("LEAD" as const) : ("MEMBER" as const) })) } },
    });
    teams[name] = t.id;
  }

  for (const p of projects) {
    const project = await db.project.create({
      data: {
        key: p.key,
        name: p.name,
        description: p.description,
        teamId: teams[p.team]!,
        ticketSeq: p.tickets.length,
        statuses: { create: STATUSES.map((s, order) => ({ ...s, order })) },
      },
      include: { statuses: true },
    });

    for (const [i, [title, statusName, type, priority, assignee, due, labels]] of p.tickets.entries()) {
      const status = project.statuses.find((s) => s.name === statusName)!;
      const reporter = u[teamMembers[p.team]![0]!]!;
      const createdAt = new Date(today.getTime() - (30 - i) * day);
      const ticket = await db.ticket.create({
        data: {
          projectId: project.id,
          number: i + 1,
          title,
          description: `Details for “${title}”.\n\nAcceptance criteria:\n- Reviewed by the team lead\n- Linked docs updated`,
          type,
          priority,
          statusId: status.id,
          assigneeId: assignee == null ? null : u[assignee]!.id,
          reporterId: reporter.id,
          dueDate: due == null ? null : inDays(due),
          labels,
          rank: (i + 1) * 1000,
          createdAt,
          completedAt: status.category === "DONE" ? new Date(today.getTime() + (due ?? -1) * day) : null,
          activity: { create: { actorId: reporter.id, field: "created", newValue: title, createdAt } },
          watchers: { create: [{ userId: reporter.id }, ...(assignee != null && u[assignee]!.id !== reporter.id ? [{ userId: u[assignee]!.id }] : [])] },
        },
      });
      if (i % 3 === 0 && assignee != null) {
        await db.comment.create({
          data: { ticketId: ticket.id, authorId: u[assignee]!.id, body: `Picked this up. @${reporter.email.split("@")[0]} I'll post an update by end of week.` },
        });
      }
    }
  }

  console.log(`Seeded ${u.length} users, ${Object.keys(teams).length} teams, ${projects.length} projects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
