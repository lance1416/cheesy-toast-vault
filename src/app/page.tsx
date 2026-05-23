import Link from "next/link";

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E\")";

const TRUST_BADGES = ["AES-256-GCM", "PBKDF2", "Zero-knowledge", "Self-hosted"];

const FEATURES = [
  {
    icon: "🔐",
    title: "Encrypted in your browser",
    body: "PBKDF2 derives your encryption key from your vault password — it never leaves your device. The server stores only ciphertext, never plaintext.",
  },
  {
    icon: "🏠",
    title: "Self-hosted",
    body: "Deploy with a single Docker Compose command. Your data lives on your hardware, not in someone else's cloud.",
  },
  {
    icon: "🔑",
    title: "Two-password model",
    body: "Your login password unlocks your account. A separate vault password unlocks your secrets. The server verifies only the first.",
  },
  {
    icon: "🔍",
    title: "Breach monitoring",
    body: "Passwords are checked against HaveIBeenPwned using k-anonymity. Your secrets are never sent to any external service.",
  },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}>
      {/* ── Dark hero ── */}
      <section className="relative min-h-screen bg-stone-900 flex flex-col overflow-hidden">
        {/* Noise + glow layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ backgroundImage: NOISE_SVG }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 900px 700px at 58% 42%, rgba(217,119,6,0.11) 0%, transparent 68%)",
          }}
        />

        {/* Nav */}
        <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
          <div className="flex items-center gap-2">
            <span className="text-xl select-none" aria-hidden="true">
              🧀
            </span>
            <span
              className="font-bold text-white text-sm tracking-tight"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Cheesy Toast Vault
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-stone-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
            >
              Get started
            </Link>
          </div>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center max-w-2xl">
            {/* Trust badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
              {TRUST_BADGES.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center rounded-full border border-stone-700 bg-stone-800/60 px-3 py-1 text-xs font-medium text-stone-400"
                >
                  {b}
                </span>
              ))}
            </div>

            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-6"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Your secrets,
              <br />
              <span className="text-amber-400">kept safe.</span>
            </h1>

            <p className="text-lg text-stone-400 mb-10 leading-relaxed max-w-xl mx-auto">
              A self-hosted password book with end-to-end encryption. Your vault password never
              leaves your browser — the server only ever sees ciphertext.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className="rounded-lg bg-amber-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
              >
                Create your vault
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-stone-700 px-7 py-3.5 text-sm font-semibold text-stone-300 hover:border-stone-500 hover:text-white transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="relative z-10 flex justify-center pb-8">
          <div className="flex flex-col items-center gap-1 text-stone-700 select-none">
            <span className="text-[10px] tracking-widest uppercase font-medium">Features</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Feature section (light) ── */}
      <section className="bg-canvas py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl font-bold text-default text-center mb-4 tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Built for security. Designed for trust.
          </h2>
          <p className="text-muted text-center mb-16 max-w-lg mx-auto">
            Every design decision puts your privacy first.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-surface rounded-xl border border-line/60 p-6 flex gap-4"
              >
                <span className="text-2xl shrink-0 mt-0.5 select-none" aria-hidden="true">
                  {f.icon}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-default mb-1.5">{f.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-stone-900 py-10 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base select-none" aria-hidden="true">
              🧀
            </span>
            <span
              className="text-stone-500 text-sm"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Cheesy Toast Vault
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-stone-600">
            <span>© {new Date().getFullYear()}</span>
            <span aria-hidden="true">·</span>
            <Link
              href="https://github.com/lance1416/cheesy-toast-vault"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-400 transition-colors"
            >
              GitHub
            </Link>
            <span aria-hidden="true">·</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
