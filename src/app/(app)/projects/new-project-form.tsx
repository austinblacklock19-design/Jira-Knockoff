"use client";

import { useActionState, useState } from "react";
import { createProject } from "@/lib/actions";

export function NewProjectForm({ teams }: { teams: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createProject, undefined);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);

  const suggestedKey = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Website Redesign" />
      </div>
      <div>
        <label className="label" htmlFor="key">Key</label>
        <input
          id="key"
          name="key"
          className="input font-mono uppercase"
          required
          maxLength={10}
          value={keyTouched ? key : suggestedKey.length >= 2 ? suggestedKey : key}
          onChange={(e) => {
            setKeyTouched(true);
            setKey(e.target.value.toUpperCase());
          }}
          placeholder="WEB"
        />
        <p className="mt-1 text-xs text-slate-500">Used in ticket IDs, like WEB-12.</p>
      </div>
      <div>
        <label className="label" htmlFor="teamId">Team</label>
        <select id="teamId" name="teamId" className="input" required>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" className="input" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
