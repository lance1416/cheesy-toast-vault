import { useEffect, useLayoutEffect, useRef } from "react";

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>, disabled = false) {
  const shortcutsRef = useRef(shortcuts);

  useLayoutEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  useEffect(() => {
    if (disabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as Element;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((target as HTMLElement).isContentEditable) return;
      const handler = shortcutsRef.current[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [disabled]);
}
