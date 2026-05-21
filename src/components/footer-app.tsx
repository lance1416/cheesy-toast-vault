/** In-app footer — authenticated pages. */
export default function FooterApp() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line/40 mt-auto">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-muted">
        <span>© {year} Cheesy Toast Vault</span>
        <span>v0.1.2</span>
      </div>
    </footer>
  );
}
