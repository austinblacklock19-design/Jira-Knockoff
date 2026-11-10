import { addStatus, updateProject, updateStatus } from "@/lib/actions";
import { db } from "@/lib/db";
import { CATEGORIES, categoryLabel } from "@/lib/format";
import { getProject } from "@/lib/queries";
import { StatusRowButtons } from "./status-buttons";

export default async function SettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = await getProject(key);
  const counts = await db.ticket.groupBy({ by: ["statusId"], where: { projectId: project.id }, _count: true });
  const countOf = (id: string) => counts.find((c) => c.statusId === id)?._count ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Project details</h2>
        <form action={updateProject} className="space-y-3">
          <input type="hidden" name="projectId" value={project.id} />
          <div>
            <label className="label" htmlFor="p-name">Name</label>
            <input id="p-name" name="name" className="input" defaultValue={project.name} required />
          </div>
          <div>
            <label className="label" htmlFor="p-desc">Description</label>
            <textarea id="p-desc" name="description" className="input" rows={2} defaultValue={project.description ?? ""} />
          </div>
          <button className="btn btn-primary">Save</button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Board columns</h2>
        <p className="mb-4 text-sm text-slate-500">
          The category decides where a column appears: <b>Backlog</b> columns show on the Backlog page, the rest on the Board. Moving a ticket into a <b>Done</b> column marks it complete for reports.
        </p>
        <ul className="space-y-2">
          {project.statuses.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <form action={updateStatus} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="statusId" value={s.id} />
                <input aria-label="Color" type="color" name="color" defaultValue={s.color} className="h-8 w-8 shrink-0 cursor-pointer rounded border border-slate-200" />
                <input aria-label="Column name" name="name" defaultValue={s.name} className="input" required />
                <select aria-label="Category" name="category" defaultValue={s.category} className="input w-36">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel[c]}</option>)}
                </select>
                <button className="btn btn-ghost border border-slate-200">Save</button>
              </form>
              <span className="w-16 text-right text-xs text-slate-400">{countOf(s.id)} tickets</span>
              <StatusRowButtons statusId={s.id} first={i === 0} last={i === project.statuses.length - 1} canDelete={countOf(s.id) === 0 && project.statuses.length > 1} />
            </li>
          ))}
        </ul>
        <form action={addStatus} className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
          <input type="hidden" name="projectId" value={project.id} />
          <input aria-label="Color" type="color" name="color" defaultValue="#64748b" className="h-8 w-8 shrink-0 cursor-pointer rounded border border-slate-200" />
          <input aria-label="New column name" name="name" placeholder="New column name" className="input" required />
          <select aria-label="Category" name="category" defaultValue="IN_PROGRESS" className="input w-36">
            {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel[c]}</option>)}
          </select>
          <button className="btn btn-primary shrink-0">Add column</button>
        </form>
      </section>
    </div>
  );
}
