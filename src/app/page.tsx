import Link from "next/link";
import Footer from "@/components/footer";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-canvas flex flex-col"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <main className="flex-1 flex items-center">
        <div className="w-full max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* ── Left: hero + CTAs ── */}
          <div>
            <span className="text-7xl block mb-6 select-none" aria-hidden="true">
              🧀
            </span>
            <h1
              className="text-5xl font-bold text-default leading-tight tracking-tight mb-4"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Cheesy Toast Vault
            </h1>
            <p className="text-lg text-muted mb-10 leading-relaxed">
              A self-hosted password book with client-side encryption. Your vault password never
              leaves your browser — the server only ever sees ciphertext.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-stone-800 dark:bg-amber-600 px-6 py-3 text-sm font-semibold text-white text-center transition hover:bg-amber-700 dark:hover:bg-amber-500"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-line bg-surface px-6 py-3 text-sm font-semibold text-default text-center transition hover:bg-line/50"
              >
                Create account
              </Link>
            </div>
          </div>

          {/* ── Right: feature highlights ── */}
          <div className="bg-surface rounded-2xl border border-line/60 divide-y divide-line/60">
            <Feature
              icon="🔐"
              title="Encrypted in your browser"
              body="Your vault password never leaves your device. The server only ever sees ciphertext — AES-256-GCM, derived via PBKDF2."
            />
            <Feature
              icon="🏠"
              title="Self-hosted"
              body="Deploy on your own server with a single Docker Compose command. Your data, your hardware, no third-party cloud."
            />
            <Feature
              icon="🔑"
              title="Two-password model"
              body="One password to log in. A separate password to unlock each vault. The server verifies only the first — it never sees the second."
            />
            <Feature
              icon="🔍"
              title="HaveIBeenPwned checks"
              body="Entries are checked against known breach databases using k-anonymity. Your passwords are never transmitted."
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex gap-4 px-7 py-5">
      <span className="text-2xl select-none mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-default mb-1">{title}</p>
        <p className="text-xs text-muted leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
