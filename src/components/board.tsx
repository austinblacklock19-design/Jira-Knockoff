"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { moveTicket } from "@/lib/actions";
import type { TicketListItem } from "@/lib/queries";
import { TicketCard } from "./ticket-card";

type Column = { id: string; name: string; color: string };
type Layout = Record<string, string[]>;

function buildLayout(columns: Column[], tickets: TicketListItem[]): Layout {
  const layout: Layout = Object.fromEntries(columns.map((c) => [c.id, [] as string[]]));
  for (const t of tickets) layout[t.statusId]?.push(t.id);
  return layout;
}

export function Board({ columns, tickets, footer }: { columns: Column[]; tickets: TicketListItem[]; footer?: Record<string, React.ReactNode> }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const byId = useMemo(() => new Map(tickets.map((t) => [t.id, t])), [tickets]);
  const [layout, setLayout] = useState<Layout>(() => buildLayout(columns, tickets));
  const dndId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Re-sync when the server sends fresh data.
  useEffect(() => setLayout(buildLayout(columns, tickets)), [columns, tickets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumn = (id: string) => (id in layout ? id : Object.keys(layout).find((c) => layout[c]!.includes(id)));

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to || from === to) return;
    setLayout((prev) => {
      const fromItems = prev[from]!.filter((id) => id !== active.id);
      const toItems = [...prev[to]!];
      const overIndex = toItems.indexOf(String(over.id));
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, String(active.id));
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const col = findColumn(id);
    if (!col) return;
    let items = layout[col]!;
    const oldIndex = items.indexOf(id);
    const overIndex = items.indexOf(String(over.id));
    if (overIndex >= 0 && overIndex !== oldIndex) {
      items = arrayMove(items, oldIndex, overIndex);
      setLayout((prev) => ({ ...prev, [col]: items }));
    }
    const idx = items.indexOf(id);
    const original = byId.get(id);
    const before = items[idx - 1] ?? null;
    const after = items[idx + 1] ?? null;
    if (original?.statusId === col && overIndex === oldIndex) return;
    startTransition(async () => {
      await moveTicket(id, col, before, after);
      router.refresh();
    });
  }

  const active = activeId ? byId.get(activeId) : null;

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex h-full gap-4">
        {columns.map((col) => (
          <BoardColumn key={col.id} column={col} ids={layout[col.id] ?? []} byId={byId} footer={footer?.[col.id]} />
        ))}
      </div>
      <DragOverlay>{active ? <TicketCard ticket={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function BoardColumn({ column, ids, byId, footer }: { column: Column; ids: string[]; byId: Map<string, TicketListItem>; footer?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100/80">
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{column.name}</h3>
        <span className="text-xs text-slate-400">{ids.length}</span>
      </header>
      <SortableContext id={column.id} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`min-h-24 flex-1 space-y-2 overflow-y-auto px-2 pb-2 ${isOver ? "bg-brand-50/60" : ""}`}>
          {ids.map((id) => {
            const t = byId.get(id);
            return t ? <SortableCard key={id} ticket={t} /> : null;
          })}
        </div>
      </SortableContext>
      {footer && <div className="px-2 pb-2">{footer}</div>}
    </section>
  );
}

function SortableCard({ ticket }: { ticket: TicketListItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <TicketCard ticket={ticket} />
    </div>
  );
}
