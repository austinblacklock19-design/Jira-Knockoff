"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markAllNotificationsRead } from "@/lib/actions";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="text-xs text-brand-600 hover:underline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead();
          router.refresh();
        })
      }
    >
      Mark all read
    </button>
  );
}
