"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PRIORITIES, TYPES, priorityLabel, typeLabel } from "@/lib/format";

export function FilterBar({ users, labels, children }: { users: { id: string; name: string }[]; labels: string[]; children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function set(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  }

  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => set("q", q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["q", "assignee", "priority", "type", "label"].some((k) => params.get(k));
  const select = "input w-auto py-1";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className="input w-56 py-1" placeholder="Search tickets…" value={q} onChange={(e) => setQ(e.target.value)} />
      <select aria-label="Assignee" className={select} value={params.get("assignee") ?? ""} onChange={(e) => set("assignee", e.target.value)}>
        <option value="">All assignees</option>
        <option value="none">Unassigned</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <select aria-label="Priority" className={select} value={params.get("priority") ?? ""} onChange={(e) => set("priority", e.target.value)}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}
      </select>
      <select aria-label="Type" className={select} value={params.get("type") ?? ""} onChange={(e) => set("type", e.target.value)}>
        <option value="">All types</option>
        {TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
      </select>
      {labels.length > 0 && (
        <select aria-label="Label" className={select} value={params.get("label") ?? ""} onChange={(e) => set("label", e.target.value)}>
          <option value="">All labels</option>
          {labels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      {active && (
        <button
          className="btn btn-ghost text-xs"
          onClick={() => {
            setQ("");
            router.replace(pathname);
          }}
        >
          Clear filters
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
