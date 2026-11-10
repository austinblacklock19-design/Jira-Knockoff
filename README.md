# Tracker

An internal project management app: Jira-style tickets and boards plus Monday-style table views. Built entirely on free, permissively licensed open-source software, so the company owns the code and pays no per-seat license.

See [docs/SPEC.md](docs/SPEC.md) for the full v1 spec and roadmap.

## What's in it today

- **Teams and projects.** Every project belongs to a team and has a short key (like `WEB`) used in ticket IDs (`WEB-12`).
- **Board.** Kanban columns with drag and drop. Columns are customizable per project in Settings.
- **Backlog.** A ranked list of not-yet-started work. Drag to reprioritize, add items inline, and send them to the board.
- **Table.** A Monday-style spreadsheet view. Edit status, assignee, priority, due date and labels inline; group by status, assignee or priority.
- **Tickets.** Title, description, type, priority, assignee, reporter, due date and labels, with comments (including `@mentions`) and a full change history.
- **My work.** Everything assigned to you across projects, sorted by due date, plus your notifications.
- **Search and filters** on every project view.
- **Sign-in with Microsoft 365** (Entra ID single sign-on).

Coming next (step 3): reports, role-based permissions and email notifications.

## Running it locally

Requirements: Node.js 22+, and Docker (for the database) or your own PostgreSQL 16.

```bash
cp .env.example .env          # then set NEXTAUTH_SECRET (any long random string)
docker compose up -d          # starts PostgreSQL on localhost:5432
npm install
npm run db:migrate            # creates the tables
npm run db:seed               # optional: loads demo teams, projects and tickets
npm run dev
```

Open http://localhost:3000. With `ALLOW_DEV_LOGIN="true"` the login page lists the demo users so you can sign in without Microsoft. Developer login is always disabled in production builds.

## Connecting Microsoft 365 sign-in

1. In the Azure portal, go to **Microsoft Entra ID → App registrations → New registration**.
2. Name it (e.g. "Tracker"), choose **Accounts in this organizational directory only**, and add a **Web** redirect URI of `https://<your-domain>/api/auth/callback/azure-ad` (and `http://localhost:3000/api/auth/callback/azure-ad` for local testing).
3. Under **Certificates & secrets**, create a client secret.
4. Set `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET` and `AZURE_AD_TENANT_ID` in the environment.

Anyone in your Microsoft tenant can then sign in; their account is created on first sign-in. The very first person to sign in becomes an admin.

## Deploying

The included `Dockerfile` builds a production image that runs database migrations on start. Any host that runs containers and PostgreSQL works; on Azure, **App Service (container)** plus **Azure Database for PostgreSQL** is the simplest fit. Set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` and the `AZURE_AD_*` variables.

## Tech stack

Next.js 15 (React 19, TypeScript), PostgreSQL with Prisma, NextAuth, Tailwind CSS, dnd-kit. All MIT, Apache-2.0 or PostgreSQL licensed.

## Project layout

```
prisma/schema.prisma        database tables
prisma/seed.ts              demo data
src/lib/actions.ts          every create/update/delete (server actions)
src/lib/auth.ts             sign-in configuration
src/app/(app)/              pages: my-work, projects, teams, project views, ticket page
src/components/             board, backlog, table, ticket page widgets
```
