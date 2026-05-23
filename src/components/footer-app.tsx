/** In-app footer — authenticated pages. */
export default function FooterApp() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line/40 mt-auto">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <span className="text-xs text-subtle" style={{ fontFamily: "var(--font-playfair, serif)" }}>
          Cheesy Toast Vault
        </span>
        <div className="flex items-center gap-3 text-xs text-subtle">
          <span>© {year}</span>
          {process.env.NEXT_PUBLIC_APP_VERSION && (
            <>
              <span aria-hidden="true">·</span>
              <span>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
