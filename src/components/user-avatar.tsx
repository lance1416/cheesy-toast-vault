"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "./theme-toggle";

const PALETTE = [
  "bg-rose-500",
  "bg-pink-500",
  "bg-fuchsia-600",
  "bg-purple-600",
  "bg-violet-600",
  "bg-blue-500",
  "bg-cyan-600",
  "bg-teal-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-orange-500",
  "bg-red-500",
] as const;

function avatarColor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) {
    h = (email.charCodeAt(i) + ((h << 5) - h)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const ITEM =
  "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left transition-colors text-muted hover:text-default hover:bg-sunken/60";

export default function UserAvatar() {
  const { data: session } = useSession();
  const email = session?.user?.email ?? "";
  const initial = email[0]?.toUpperCase() ?? "?";
  const color = avatarColor(email);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
        className={`rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 ${
          open ? "ring-2 ring-amber-400 ring-offset-1" : ""
        }`}
      >
        <div
          className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-xs font-bold text-white select-none`}
        >
          {initial}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-lg border border-line/60 bg-surface shadow-lg shadow-black/10 z-50 p-1.5">
          {/* Identity */}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div
              className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-sm font-bold text-white shrink-0 select-none`}
            >
              {initial}
            </div>
            <p className="text-xs text-muted truncate">{email}</p>
          </div>

          <div className="my-1 mx-1 h-px bg-divider" />

          {/* Theme */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted">Theme</span>
            <ThemeToggle />
          </div>

          <div className="my-1 mx-1 h-px bg-divider" />

          {/* App-level nav */}
          <Link href="/settings" onClick={() => setOpen(false)} className={ITEM}>
            Settings
          </Link>

          <div className="my-1 mx-1 h-px bg-divider" />

          <button type="button" className={ITEM} onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
