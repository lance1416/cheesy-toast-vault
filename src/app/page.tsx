import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-canvas flex items-center justify-center px-4 py-16"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo + name */}
        <div className="text-center mb-10">
          <span className="text-6xl block mb-5 select-none" aria-hidden="true">
            🧀
          </span>
          <h1
            className="text-4xl font-bold text-default leading-tight tracking-tight mb-3"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Cheesy Toast Vault
          </h1>
          <p className="text-base text-muted">Your personal encrypted password book.</p>
        </div>

        {/* Feature highlights */}
        <div className="bg-surface rounded-xl border border-line/60 px-7 py-6 mb-6 space-y-4">
          <Feature
            icon="🔐"
            title="Encrypted in your browser"
            body="Your vault password never leaves your device. The server only ever sees ciphertext."
          />
          <div className="border-t border-line/60" />
          <Feature
            icon="🏠"
            title="Self-hosted"
            body="Deploy on your own server with a single Docker Compose command. Your data, your hardware."
          />
          <div className="border-t border-line/60" />
          <Feature
            icon="🔑"
            title="Two-password model"
            body="One password to log in. A separate password to unlock your vault. The server verifies only the first."
          />
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white text-center transition hover:bg-amber-700 dark:hover:bg-amber-500"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="w-full rounded-lg border border-line bg-surface py-2.5 text-sm font-semibold text-default text-center transition hover:bg-line/50"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex gap-3.5 items-start">
      <span className="text-xl select-none mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-default mb-0.5">{title}</p>
        <p className="text-xs text-muted leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
