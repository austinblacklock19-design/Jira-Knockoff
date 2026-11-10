"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addComment, deleteComment, deleteTicket, editComment, type TicketField, toggleWatch, updateTicket } from "@/lib/actions";
import { PRIORITIES, TYPES, isOverdue, priorityLabel, timeAgo, toDateInput, typeLabel } from "@/lib/format";
import { Avatar } from "./ui";

function useSave(ticketId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const save = (field: TicketField, value: string) =>
    startTransition(async () => {
      await updateTicket(ticketId, field, value);
      router.refresh();
    });
  return { save, pending };
}

export function EditableTitle({ ticketId, title }: { ticketId: string; title: string }) {
  const { save } = useSave(ticketId);
  return (
    <textarea
      aria-label="Title"
      key={title}
      defaultValue={title}
      rows={1}
      className="w-full resize-none rounded-md border border-transparent bg-transparent px-1 text-2xl font-semibold outline-none [field-sizing:content] hover:border-slate-200 focus:border-brand-500"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v && v !== title) save("title", v);
        else e.target.value = title;
      }}
    />
  );
}

export function EditableDescription({ ticketId, description }: { ticketId: string; description: string }) {
  const { save, pending } = useSave(ticketId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setDraft(description);
          setEditing(true);
        }}
        onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
        className="min-h-16 cursor-text whitespace-pre-wrap rounded-md p-2 text-sm leading-relaxed hover:bg-slate-100"
      >
        {description || <span className="text-slate-400">Add a description…</span>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <textarea className="input min-h-40 leading-relaxed" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div className="flex gap-2">
        <button
          className="btn btn-primary"
          disabled={pending}
          onClick={() => {
            save("description", draft);
            setEditing(false);
          }}
        >
          Save
        </button>
        <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}

type FieldsProps = {
  ticketId: string;
  statusId: string;
  statusCategory: string;
  statuses: { id: string; name: string; color: string }[];
  assigneeId: string | null;
  users: { id: string; name: string }[];
  priority: string;
  type: string;
  dueDate: Date | null;
  labels: string[];
};

export function TicketFields(p: FieldsProps) {
  const { save, pending } = useSave(p.ticketId);
  const status = p.statuses.find((s) => s.id === p.statusId);
  const overdue = isOverdue(p.dueDate, p.statusCategory as never);
  return (
    <div className={`space-y-4 ${pending ? "opacity-70" : ""}`}>
      <div>
        <label className="label" htmlFor="f-status">Status</label>
        <select
          id="f-status"
          className="input font-medium text-white"
          style={{ backgroundColor: status?.color }}
          value={p.statusId}
          onChange={(e) => save("statusId", e.target.value)}
        >
          {p.statuses.map((s) => <option key={s.id} value={s.id} className="bg-white text-slate-900">{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-assignee">Assignee</label>
        <select id="f-assignee" className="input" value={p.assigneeId ?? ""} onChange={(e) => save("assigneeId", e.target.value)}>
          <option value="">Unassigned</option>
          {p.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="f-priority">Priority</label>
          <select id="f-priority" className="input" value={p.priority} onChange={(e) => save("priority", e.target.value)}>
            {PRIORITIES.map((x) => <option key={x} value={x}>{priorityLabel[x]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-type">Type</label>
          <select id="f-type" className="input" value={p.type} onChange={(e) => save("type", e.target.value)}>
            {TYPES.map((x) => <option key={x} value={x}>{typeLabel[x]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="f-due">
          Due date {overdue && <span className="ml-1 normal-case text-red-600">· overdue</span>}
        </label>
        <input id="f-due" type="date" className={`input ${overdue ? "border-red-300 text-red-700" : ""}`} value={toDateInput(p.dueDate)} onChange={(e) => save("dueDate", e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="f-labels">Labels</label>
        <input
          id="f-labels"
          className="input"
          key={p.labels.join(",")}
          defaultValue={p.labels.join(", ")}
          placeholder="Comma separated"
          onBlur={(e) => e.target.value !== p.labels.join(", ") && save("labels", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </div>
    </div>
  );
}

export function TicketActions({ ticketId, watching, watcherCount }: { ticketId: string; watching: boolean; watcherCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="btn btn-ghost border border-slate-200"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleWatch(ticketId);
            router.refresh();
          })
        }
      >
        {watching ? "Stop watching" : "Watch"} · {watcherCount}
      </button>
      {confirming ? (
        <>
          <button className="btn bg-red-600 text-white hover:bg-red-700" disabled={pending} onClick={() => startTransition(() => deleteTicket(ticketId))}>
            Yes, delete
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
        </>
      ) : (
        <button className="btn btn-danger" onClick={() => setConfirming(true)}>Delete</button>
      )}
    </div>
  );
}

type CommentItem = { id: string; body: string; createdAt: Date; updatedAt: Date; author: { id: string; name: string } };

function renderBody(body: string) {
  return body.split(/(@[a-zA-Z0-9._-]+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="rounded bg-brand-50 px-0.5 font-medium text-brand-700">{part}</span>
    ) : (
      part
    ),
  );
}

export function Comments({ ticketId, comments, currentUserId, isAdmin }: { ticketId: string; comments: CommentItem[]; currentUserId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <textarea
            className="input"
            rows={3}
            placeholder="Add a comment… Mention someone with @ and the first part of their email, like @jordan.lee"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) {
                run(async () => {
                  await addComment(ticketId, draft);
                  setDraft("");
                });
              }
            }}
          />
          <button
            className="btn btn-primary"
            disabled={pending || !draft.trim()}
            onClick={() =>
              run(async () => {
                await addComment(ticketId, draft);
                setDraft("");
              })
            }
          >
            Comment
          </button>
        </div>
      </div>
      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.author.name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{c.author.name}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {timeAgo(c.createdAt)}
                  {c.updatedAt.getTime() - c.createdAt.getTime() > 1000 && " · edited"}
                </span>
              </p>
              {editingId === c.id ? (
                <div className="mt-1 space-y-2">
                  <textarea className="input" rows={3} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} />
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        run(async () => {
                          await editComment(c.id, editDraft);
                          setEditingId(null);
                        })
                      }
                    >
                      Save
                    </button>
                    <button className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{renderBody(c.body)}</p>
              )}
              {editingId !== c.id && (c.author.id === currentUserId || isAdmin) && (
                <div className="mt-1 flex gap-3 text-xs text-slate-400">
                  {c.author.id === currentUserId && (
                    <button
                      className="hover:text-slate-700"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditDraft(c.body);
                      }}
                    >
                      Edit
                    </button>
                  )}
                  <button className="hover:text-red-600" onClick={() => run(() => deleteComment(c.id))}>Delete</button>
                </div>
              )}
            </div>
          </li>
        ))}
        {comments.length === 0 && <li className="text-sm text-slate-400">No comments yet.</li>}
      </ul>
    </div>
  );
}
