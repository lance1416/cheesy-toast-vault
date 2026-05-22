"use client";

import Modal from "@/components/modal";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded border border-line bg-sunken px-1.5 py-0.5 text-xs font-mono text-default min-w-[1.5rem]">
      {children}
    </kbd>
  );
}

const SHORTCUTS = [
  { key: "/", label: "Focus search" },
  { key: "n", label: "New entry / New vault" },
  { key: "?", label: "Show shortcuts" },
  { key: "Esc", label: "Close dialog" },
];

export default function KeyboardShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" titleId="shortcuts-title" onClose={onClose}>
      <dl className="space-y-3">
        {SHORTCUTS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="m-0">
              <Kbd>{key}</Kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
