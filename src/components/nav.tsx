"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export function NavLink({ href, matchPrefix, children }: { href: string; matchPrefix?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (matchPrefix && pathname.startsWith(matchPrefix));
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </Link>
  );
}

export function TabLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`border-b-2 px-1 pb-2 text-sm ${active ? "border-brand-600 font-medium text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
    >
      {children}
    </Link>
  );
}

export function SignOutButton() {
  return (
    <button title="Sign out" className="btn btn-ghost px-2 text-xs" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign out
    </button>
  );
}
