"use client";

import { passwordStrength } from "@/lib/crypto";

const COLORS = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-lime-500", "bg-green-500"];

export default function StrengthBar({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? COLORS[score] : "bg-line"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
