"use client";

import { signIn } from "next-auth/react";

export function LoginButtons({ microsoft, devUsers }: { microsoft: boolean; devUsers: { name: string; email: string }[] }) {
  return (
    <div className="space-y-6">
      {microsoft && (
        <button className="btn btn-primary w-full justify-center py-2" onClick={() => signIn("azure-ad", { callbackUrl: "/my-work" })}>
          Sign in with Microsoft
        </button>
      )}
      {devUsers.length > 0 && (
        <div>
          <p className="label">Developer login (local only)</p>
          <div className="space-y-1">
            {devUsers.map((u) => (
              <button
                key={u.email}
                className="btn btn-ghost w-full justify-start border border-slate-200"
                onClick={() => signIn("dev", { email: u.email, callbackUrl: "/my-work" })}
              >
                {u.name}
                <span className="ml-auto text-xs text-slate-400">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
