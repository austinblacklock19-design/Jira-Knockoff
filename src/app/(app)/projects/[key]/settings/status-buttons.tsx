"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteStatus, moveStatus } from "@/lib/actions";

export function StatusRowButtons({ statusId, first, last, canDelete }: { statusId: string; first: boolean; last: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  return (
    <div className="flex shrink-0 gap-1">
      <button className="btn btn-ghost px-2" aria-label="Move up" disabled={first || pending} onClick={() => run(() => moveStatus(statusId, -1))}>↑</button>
      <button className="btn btn-ghost px-2" aria-label="Move down" disabled={last || pending} onClick={() => run(() => moveStatus(statusId, 1))}>↓</button>
      <button
        className="btn btn-danger px-2"
        disabled={!canDelete || pending}
        title={canDelete ? "Delete column" : "Only empty columns can be deleted"}
        onClick={() => run(() => deleteStatus(statusId))}
      >
        Delete
      </button>
    </div>
  );
}
