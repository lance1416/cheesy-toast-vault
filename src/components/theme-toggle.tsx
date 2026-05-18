"use client";

import { useColorScheme, type ColorScheme } from "@/lib/color-scheme";

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
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
      width="14"
      height="14"
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
      width="14"
      height="14"
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

const SCHEMES: { value: ColorScheme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light mode", icon: <SunIcon /> },
  { value: "system", label: "System theme", icon: <SystemIcon /> },
  { value: "dark", label: "Dark mode", icon: <MoonIcon /> },
];

export default function ThemeToggle() {
  const { scheme, setScheme } = useColorScheme();

  return (
    <div role="group" aria-label="Color theme" className="flex items-center gap-0.5">
      {SCHEMES.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setScheme(value)}
          aria-label={label}
          aria-pressed={scheme === value}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
            scheme === value
              ? "bg-line text-default"
              : "text-subtle hover:text-default hover:bg-line"
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
