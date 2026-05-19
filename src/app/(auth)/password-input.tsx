"use client";

import { EyeIcon } from "@/components/icons";

// Auth-flow password input with a show/hide toggle.
// The visual style matches the auth pages (sunken background, amber focus ring) —
// for vault forms, use `Field` instead.
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  minLength,
  required = true,
  autoFocus,
  autoComplete = "new-password",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  show: boolean;
  onToggle: () => void;
  minLength?: number;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 pr-10 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={show}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default transition-colors"
      >
        <EyeIcon open={show} size={15} />
      </button>
    </div>
  );
}
