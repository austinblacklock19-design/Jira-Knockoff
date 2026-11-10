import Link from "next/link";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { NewProjectForm } from "./new-project-form";

export default async function ProjectsPage() {
  const [projects, teams] = await Promise.all([
    db.project.findMany({
      where: { archived: false },
      orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
      include: { team: true, tickets: { select: { status: { select: { category: true } } } } },
    }),
    db.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">All projects</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {projects.length === 0 && <EmptyState title="No projects yet">Create your first project with the form.</EmptyState>}
          {projects.map((p) => {
            const open = p.tickets.filter((t) => t.status.category !== "DONE").length;
            return (
              <Link key={p.id} href={`/projects/${p.key}/board`} className="card flex items-center gap-4 p-4 hover:border-brand-500">
                <span className="w-14 rounded bg-slate-100 py-1 text-center font-mono text-xs font-semibold text-slate-600">{p.key}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="truncate text-sm text-slate-500">{p.description || p.team.name}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{p.team.name}</p>
                  <p>
                    {open} open / {p.tickets.length} total
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold">New project</h2>
          {teams.length === 0 ? (
            <p className="text-sm text-slate-500">
              Create a <Link href="/teams" className="text-brand-600 underline">team</Link> first; every project belongs to a team.
            </p>
          ) : (
            <NewProjectForm teams={teams.map((t) => ({ id: t.id, name: t.name }))} />
          )}
        </div>
      </div>
    </div>
  );
}
