"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "./icons";

const FOCUSABLE =
  'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export default function Modal({
  title,
  titleId,
  onClose,
  children,
  maxWidth = "max-w-md",
  scrollable = false,
}: {
  title: string;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  scrollable?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture trigger element; restore focus on close
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus trap + initial focus
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const first = cardRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });

    function trapTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !cardRef.current) return;
      const focusable = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", trapTab);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", trapTab);
    };
  }, []);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "w-full bg-surface rounded-2xl border border-line/80 shadow-xl px-8 py-8",
          maxWidth,
          scrollable ? "max-h-[90vh] overflow-y-auto" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            id={titleId}
            className="text-xl font-bold text-default tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-subtle hover:text-default transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
