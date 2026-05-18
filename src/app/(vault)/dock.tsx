"use client";

import { useColorScheme, type ColorScheme } from "@/lib/color-scheme";

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const SCHEMES: { value: ColorScheme; icon: React.ReactNode; label: string }[] = [
  { value: "light", icon: <SunIcon />, label: "Light mode" },
  { value: "system", icon: <SystemIcon />, label: "System theme" },
  { value: "dark", icon: <MoonIcon />, label: "Dark mode" },
];

export default function Dock() {
  const { scheme, setScheme } = useColorScheme();

  return (
    <div
      role="toolbar"
      aria-label="Display settings"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-1 rounded-full bg-surface/90 dark:bg-surface/95 backdrop-blur-md border border-line shadow-lg shadow-black/10 px-3 py-2">
        {SCHEMES.map(({ value, icon, label }) => {
          const active = scheme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setScheme(value)}
              aria-label={label}
              aria-pressed={active}
              className={[
                "inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                active ? "bg-default text-surface" : "text-muted hover:text-default hover:bg-line",
              ].join(" ")}
            >
              {icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
