import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-canvas flex items-center justify-center px-4"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <div className="text-center">
        <span className="text-6xl block mb-6 select-none" aria-hidden="true">
          🔍
        </span>
        <h1
          className="text-3xl font-bold text-default mb-2"
          style={{ fontFamily: "var(--font-playfair, serif)" }}
        >
          Page not found
        </h1>
        <p className="text-sm text-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 dark:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
