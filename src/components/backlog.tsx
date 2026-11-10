"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createTicket, moveTicket, updateTicket } from "@/lib/actions";
import { formatDate, isOverdue, ticketKey } from "@/lib/format";
import type { TicketListItem } from "@/lib/queries";
import { Avatar, Label, PriorityBadge, TypeIcon } from "./ui";

type Props = {
  projectId: string;
  backlogStatusId: string;
  boardStatusId: string | null;
  boardStatusName: string | null;
  tickets: TicketListItem[];
  canReorder: boolean;
};

export function Backlog({ projectId, backlogStatusId, boardStatusId, boardStatusName, tickets, canReorder }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ids, setIds] = useState(() => tickets.map((t) => t.id));
  const byId = new Map(tickets.map((t) => [t.id, t]));
  const dndId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setIds(tickets.map((t) => t.id)), [tickets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setIds(next);
    const i = next.indexOf(String(active.id));
    const t = byId.get(String(active.id))!;
    startTransition(async () => {
      await moveTicket(t.id, t.statusId, next[i - 1] ?? null, next[i + 1] ?? null);
      router.refresh();
    });
  }

  function sendToBoard(id: string) {
    if (!boardStatusId) return;
    setIds((prev) => prev.filter((x) => x !== id));
    startTransition(async () => {
      await updateTicket(id, "statusId", boardStatusId);
      router.refresh();
    });
  }

  return (
    <div className="card divide-y divide-slate-100">
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={!canReorder}>
          {ids.map((id, index) => {
            const t = byId.get(id);
            return t ? (
              <Row key={id} ticket={t} index={index} draggable={canReorder} onSend={boardStatusId ? () => sendToBoard(id) : undefined} sendLabel={boardStatusName} />
            ) : null;
          })}
        </SortableContext>
      </DndContext>
      {ids.length === 0 && <p className="p-6 text-center text-sm text-slate-500">The backlog is empty.</p>}
      <form
        className="flex gap-2 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (!String(fd.get("title") ?? "").trim()) return;
          startTransition(async () => {
            await createTicket(fd);
            if (inputRef.current) inputRef.current.value = "";
            router.refresh();
          });
        }}
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="statusId" value={backlogStatusId} />
        <input ref={inputRef} name="title" className="input border-transparent shadow-none" placeholder="+ Add to backlog (press Enter)" />
        <button className="btn btn-ghost" disabled={pending}>Add</button>
      </form>
    </div>
  );
}

function Row({ ticket, index, draggable, onSend, sendLabel }: { ticket: TicketListItem; index: number; draggable: boolean; onSend?: () => void; sendLabel: string | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  const overdue = isOverdue(ticket.dueDate, ticket.status.category);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-3 bg-white px-3 py-2 text-sm ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      {draggable && (
        <button className="cursor-grab text-slate-300 hover:text-slate-500" aria-label="Drag to reorder" {...attributes} {...listeners}>
          ⠿
        </button>
      )}
      <span className="w-6 text-right text-xs text-slate-400">{index + 1}</span>
      <TypeIcon type={ticket.type} />
      <span className="w-16 shrink-0 font-mono text-xs text-slate-500">{ticketKey(ticket.project.key, ticket.number)}</span>
      <Link href={`/projects/${ticket.project.key}/tickets/${ticket.number}`} className="min-w-0 flex-1 truncate hover:text-brand-700">
        {ticket.title}
      </Link>
      <div className="hidden gap-1 md:flex">{ticket.labels.map((l) => <Label key={l}>{l}</Label>)}</div>
      {ticket.dueDate && <span className={`text-xs ${overdue ? "font-semibold text-red-600" : "text-slate-500"}`}>{formatDate(ticket.dueDate)}</span>}
      <PriorityBadge priority={ticket.priority} />
      <Avatar name={ticket.assignee?.name} size="sm" />
      {onSend && (
        <button onClick={onSend} className="btn btn-ghost px-2 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100">
          Move to {sendLabel} →
        </button>
      )}
    </div>
  );
}
