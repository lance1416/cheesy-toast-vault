"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 8000;

export default function UndoToast({
  label,
  onUndo,
  onExpire,
}: {
  label: string;
  onUndo: () => void;
  onExpire: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const pct = Math.max(0, 1 - (now - start) / DURATION_MS);
      setProgress(pct * 100);
      if (pct > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        onExpireRef.current();
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-xl overflow-hidden shadow-xl bg-stone-800 dark:bg-stone-900 border border-white/10">
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          <span className="text-sm font-medium text-white/90">{label}</span>
          <button
            type="button"
            onClick={onUndo}
            className="text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors shrink-0"
          >
            Undo
          </button>
        </div>
        <div className="h-[3px] bg-white/10">
          <div
            className="h-full bg-amber-400"
            style={{ width: `${progress}%`, transition: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
