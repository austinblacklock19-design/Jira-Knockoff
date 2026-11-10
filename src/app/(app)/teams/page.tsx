import Link from "next/link";
import { addTeamMember, createTeam, removeTeamMember } from "@/lib/actions";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui";

export default async function TeamsPage() {
  const [teams, users] = await Promise.all([
    db.team.findMany({
      orderBy: { name: "asc" },
      include: { members: { include: { user: true }, orderBy: { user: { name: "asc" } } }, projects: { where: { archived: false } } },
    }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Teams</h1>
      <form action={createTeam} className="card mb-6 flex gap-2 p-4">
        <input name="name" className="input" placeholder="New team name, e.g. Marketing" required />
        <button className="btn btn-primary shrink-0">Create team</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team) => {
          const memberIds = new Set(team.members.map((m) => m.userId));
          const others = users.filter((u) => !memberIds.has(u.id));
          return (
            <div key={team.id} className="card p-5">
              <h2 className="font-semibold">{team.name}</h2>
              <p className="mb-3 text-xs text-slate-500">
                {team.projects.length === 0
                  ? "No projects"
                  : team.projects.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ", "}
                        <Link className="text-brand-600 hover:underline" href={`/projects/${p.key}/board`}>{p.name}</Link>
                      </span>
                    ))}
              </p>
              <ul className="mb-3 space-y-1.5">
                {team.members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-2 text-sm">
                    <Avatar name={m.user.name} size="sm" />
                    <span>{m.user.name}</span>
                    {m.role === "LEAD" && <span className="rounded bg-brand-50 px-1.5 text-[11px] text-brand-700">Lead</span>}
                    <form action={removeTeamMember} className="ml-auto">
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="userId" value={m.userId} />
                      <button className="text-xs text-slate-400 hover:text-red-600">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
              {others.length > 0 && (
                <form action={addTeamMember} className="flex gap-2">
                  <input type="hidden" name="teamId" value={team.id} />
                  <select name="userId" className="input">
                    {others.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-ghost shrink-0 border border-slate-200">Add</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
