"use client";

import { useEffect } from "react";
import { Loader2, TriangleAlert, X } from "lucide-react";
import type { TFunction } from "@/lib/i18n";

export type Toast = {
  id: number;
  tone: "error" | "info";
  message: string;
  /** Milliseconds before it hides itself; defaults per tone. */
  durationMs?: number;
};

const DEFAULT_DURATION: Record<Toast["tone"], number> = {
  info: 2000,
  error: 6000,
};

export function ToastStack({
  toasts,
  onDismiss,
  t,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  t: TFunction;
}) {
  if (toasts.length === 0) {
    return null;
  }
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} t={t} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
  t,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
  t: TFunction;
}) {
  const duration = toast.durationMs ?? DEFAULT_DURATION[toast.tone];

  // Auto-hide: the confirmations ("Result saved") shouldn't need a click to clear.
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss, toast.id]);

  return (
    <div
      role="status"
      className={`bb-slide-up pointer-events-auto flex max-w-xl items-start gap-3 rounded-2xl px-4 py-3 text-sm app-shadow ${
        toast.tone === "error"
          ? "bg-rose-50 text-rose-900 ring-1 ring-rose-200"
          : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
      }`}
    >
      <TriangleAlert
        className={`mt-0.5 size-4 shrink-0 ${toast.tone === "error" ? "" : "opacity-40"}`}
      />
      <p className="flex-1 leading-relaxed">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={t("toast.dismiss")}
        title={t("toast.dismiss")}
        className="rounded-full p-1 transition hover:bg-black/5"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex items-center gap-3 rounded-2xl bg-surface px-6 py-4 text-sm text-neutral-600 app-shadow">
        <Loader2 className="size-4 animate-spin text-accent" />
        <span>{label}</span>
      </div>
    </div>
  );
}
