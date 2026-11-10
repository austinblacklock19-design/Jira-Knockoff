import { getActiveUsers, getProject } from "@/lib/queries";
import { TabLink } from "@/components/nav";
import { NewTicketButton } from "@/components/new-ticket";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const { key } = await params;
  const [project, users] = await Promise.all([getProject(key), getActiveUsers()]);
  const base = `/projects/${project.key}`;

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-slate-200 bg-white px-8 pt-5">
        <div className="mb-4 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">
              {project.team.name} / <span className="font-mono">{project.key}</span>
            </p>
            <h1 className="truncate text-xl font-semibold">{project.name}</h1>
          </div>
          <NewTicketButton
            projectId={project.id}
            projectKey={project.key}
            statuses={project.statuses.map((s) => ({ id: s.id, name: s.name, category: s.category }))}
            users={users}
          />
        </div>
        <nav className="flex gap-6">
          <TabLink href={`${base}/board`}>Board</TabLink>
          <TabLink href={`${base}/backlog`}>Backlog</TabLink>
          <TabLink href={`${base}/table`}>Table</TabLink>
          <TabLink href={`${base}/settings`}>Settings</TabLink>
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
