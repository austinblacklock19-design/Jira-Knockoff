"use client";

import type { StatusCategory } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createTicket } from "@/lib/actions";
import { PRIORITIES, TYPES, priorityLabel, typeLabel } from "@/lib/format";

type Props = {
  projectId: string;
  projectKey: string;
  statuses: { id: string; name: string; category: StatusCategory }[];
  users: { id: string; name: string }[];
  defaultStatusId?: string;
  label?: string;
  variant?: "primary" | "ghost";
};

export function NewTicketButton({ projectId, projectKey, statuses, users, defaultStatusId, label = "New ticket", variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const initialStatus = defaultStatusId ?? statuses.find((s) => s.category === "TODO")?.id ?? statuses[0]?.id;

  function submit(fd: FormData, keepOpen: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createTicket(fd);
        router.refresh();
        if (keepOpen) {
          if (titleRef.current) titleRef.current.value = "";
          titleRef.current?.focus();
        } else {
          setOpen(false);
          router.push(`/projects/${projectKey}/tickets/${res.number}`);
        }
      } catch {
        setError("Couldn't create the ticket. Please try again.");
      }
    });
  }

  return (
    <>
      <button className={`btn ${variant === "primary" ? "btn-primary" : "btn-ghost w-full justify-start text-slate-500"}`} onClick={() => setOpen(true)}>
        + {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[10vh]" onMouseDown={() => setOpen(false)}>
          <form
            className="card w-full max-w-xl space-y-4 p-6 text-left"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
              submit(new FormData(e.currentTarget), submitter?.value === "another");
            }}
          >
            <h2 className="text-lg font-semibold">New ticket in {projectKey}</h2>
            <input type="hidden" name="projectId" value={projectId} />
            <div>
              <label className="label" htmlFor="nt-title">Title</label>
              <input ref={titleRef} id="nt-title" name="title" className="input" required placeholder="What needs to be done?" />
            </div>
            <div>
              <label className="label" htmlFor="nt-desc">Description</label>
              <textarea id="nt-desc" name="description" className="input" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="nt-type">Type</label>
                <select id="nt-type" name="type" className="input" defaultValue="TASK">
                  {TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="nt-priority">Priority</label>
                <select id="nt-priority" name="priority" className="input" defaultValue="MEDIUM">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="nt-status">Status</label>
                <select id="nt-status" name="statusId" className="input" defaultValue={initialStatus}>
                  {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="nt-assignee">Assignee</label>
                <select id="nt-assignee" name="assigneeId" className="input" defaultValue="">
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="nt-due">Due date</label>
                <input id="nt-due" name="dueDate" type="date" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="nt-labels">Labels</label>
                <input id="nt-labels" name="labels" className="input" placeholder="design, q1" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" value="another" className="btn btn-ghost border border-slate-200" disabled={pending}>Create and add another</button>
              <button type="submit" value="open" className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
