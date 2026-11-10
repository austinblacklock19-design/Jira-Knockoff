import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, devLoginEnabled, microsoftLoginEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { LoginButtons } from "./login-buttons";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { id?: string } | undefined)?.id) redirect("/my-work");

  const devUsers = devLoginEnabled
    ? await db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 12, select: { name: true, email: true } })
    : [];

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 font-bold text-white">T</span>
          <h1 className="text-xl font-semibold">Tracker</h1>
        </div>
        <LoginButtons microsoft={microsoftLoginEnabled} devUsers={devUsers} />
        {!microsoftLoginEnabled && !devLoginEnabled && (
          <p className="text-sm text-red-600">
            No sign-in method is configured. Set the AZURE_AD_* environment variables to enable Microsoft sign-in.
          </p>
        )}
      </div>
    </main>
  );
}
