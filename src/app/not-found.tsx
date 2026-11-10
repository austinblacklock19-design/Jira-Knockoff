import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-slate-500">That project or ticket doesn&apos;t exist, or it was deleted.</p>
      <Link href="/my-work" className="btn btn-primary">Go to My work</Link>
    </main>
  );
}
