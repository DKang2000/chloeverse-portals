import Link from "next/link";

export default function CollabsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-white/65">Chloeverse</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">Collabs</h1>
        <p className="mt-4 max-w-2xl text-sm text-white/75 sm:text-base">
          Enter the reels experience.
        </p>
        <Link
          href="/collabs/reels"
          className="mt-10 inline-flex items-center rounded-full border border-white/25 px-6 py-3 text-xs uppercase tracking-[0.2em] text-white transition hover:border-white/55 hover:bg-white/10"
        >
          View Reels
        </Link>
      </div>
    </main>
  );
}
