# Internal Project Tracker: v1 Spec

**Status:** Draft for review
**Goal:** A company-owned, license-free project management web app that combines Jira-style ticket tracking with Monday-style table views, usable by every team for every project.

---

## 1. What v1 must do

| Area | v1 (day one) | Later |
|---|---|---|
| Boards | Kanban board per project, drag and drop between columns, customizable columns | Swimlanes, WIP limits |
| Backlog | Ordered list of not-yet-started tickets, drag to reprioritize, move to board | Sprints and sprint planning |
| Table view | Monday-style spreadsheet view, inline editing, group by status / assignee / priority | Custom columns, formulas |
| Tickets | Key (e.g. `MKT-42`), title, description (rich text), type, status, priority, assignee, reporter, due date, labels | Subtasks, links between tickets, custom fields, attachments |
| Comments | Threaded comments with @mentions, edit/delete own | Reactions |
| Activity | History of every change on a ticket (who changed what, when) | Company-wide activity feed |
| My Work | One page listing everything assigned to me across all projects, sorted by due date | Saved filters |
| Search & filters | Search by text; filter by assignee, status, priority, label, due date | Advanced query language |
| Reports | Open tickets by person, overdue tickets, created vs. completed per week, status breakdown per project; CSV export | Burndown/velocity (needs sprints), custom dashboards |
| Notifications | In-app + email when assigned, mentioned, or a ticket you watch changes | Slack/Teams integration |

## 2. How work is organized

```
Company (one install)
 └─ Teams (e.g. Marketing, Engineering, Operations)
     └─ Projects (each has a short key, e.g. MKT)
         └─ Tickets (MKT-1, MKT-2, ...)
             └─ Comments, activity history
```

- A person can belong to several teams.
- Every project belongs to one team; other teams can be granted access.

## 3. Roles

| Role | Can do |
|---|---|
| **Admin** | Everything: manage users, teams, company settings |
| **Team lead** | Create/archive projects in their team, manage team members, edit board columns |
| **Member** | Create, edit, assign and comment on tickets in projects they can access |
| **Viewer** | Read-only access (useful for leadership or other teams) |

## 4. Data model (v1)

- **User**: name, email, avatar, company role, active flag
- **Team**: name, members (with team role)
- **Project**: team, name, key, description, archived flag
- **Status**: project, name, color, order, category (`backlog` / `todo` / `in_progress` / `done`)
- **Ticket**: project, number, title, description, type (task / bug / story), status, priority (low / medium / high / urgent), assignee, reporter, due date, labels, rank (for ordering), created/updated/completed timestamps
- **Comment**: ticket, author, body, timestamps
- **ActivityEvent**: ticket, actor, field changed, old value, new value, timestamp
- **Notification**: recipient, type, ticket, read flag
- **Watcher**: user, ticket

## 5. Tech stack

Every piece is free and permissively licensed (MIT / Apache-2.0 / PostgreSQL License), so the company owns the code outright and owes no license fees.

| Layer | Choice | Why |
|---|---|---|
| App framework | **Next.js + TypeScript** | One codebase for UI and API, very widely known, easy to hire for |
| Database | **PostgreSQL** | Reliable, free, available on every cloud and on-site |
| Database access | **Prisma** | Type-safe queries and managed migrations |
| Login | **Auth.js** | Plugs into Microsoft 365 (Entra ID) or Google Workspace SSO |
| UI | **Tailwind CSS + shadcn/ui** | Clean, accessible components the company owns as source |
| Drag and drop | **dnd-kit** | Boards and backlog reordering |
| Charts | **Recharts** | Reports page |
| Email | Company SMTP server | Notifications |
| Packaging | **Docker** | Runs the same on a laptop, on-site server, Azure or AWS |

## 6. Not in v1

Sprints, time tracking, automations/rules, custom fields, file attachments, mobile app, public API, Slack/Teams integration. The data model leaves room for each of these.

## 7. Open questions

1. **Hosting:** Azure, AWS, Google Cloud, or an on-site server?
2. **Login:** Does the company sign in with Microsoft 365 or Google Workspace?
3. **Importing:** Should existing Jira or Monday data be imported at launch?
4. **Name:** What should the app be called internally?
5. **Pilot team:** Which team tries it first?

## 8. Build order

1. **Spec** (this document)
2. **Core app:** projects, boards, backlog, table view, tickets, comments, activity
3. **Reports and team features:** reports page, roles/permissions, notifications, My Work
4. **Deploy and pilot:** host it, connect company login, one team pilots, then roll out
