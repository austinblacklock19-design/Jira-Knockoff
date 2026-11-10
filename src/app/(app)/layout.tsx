import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui";
import { NavLink, SignOutButton } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [projects, unread] = await Promise.all([
    db.project.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { key: true, name: true } }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <Link href="/my-work" className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">T</span>
          <span className="font-semibold">Tracker</span>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 text-sm">
          <NavLink href="/my-work">
            My work
            {unread > 0 && <span className="ml-auto rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{unread}</span>}
          </NavLink>
          <NavLink href="/projects">All projects</NavLink>
          <NavLink href="/teams">Teams</NavLink>
          <p className="label px-2 pt-4">Projects</p>
          {projects.map((p) => (
            <NavLink key={p.key} href={`/projects/${p.key}/board`} matchPrefix={`/projects/${p.key}`}>
              <span className="w-10 shrink-0 font-mono text-[11px] text-slate-400">{p.key}</span>
              <span className="truncate">{p.name}</span>
            </NavLink>
          ))}
          {projects.length === 0 && <p className="px-2 text-xs text-slate-400">No projects yet.</p>}
        </nav>
        <div className="flex items-center gap-2 border-t border-slate-200 p-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
