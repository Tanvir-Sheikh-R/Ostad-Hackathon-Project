"use client";

import { LineChart, ListChecks, MessageSquareText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TabKey = "chat" | "quiz" | "progress";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "chat", label: "চ্যাট", icon: MessageSquareText },
  { key: "quiz", label: "কুইজ", icon: ListChecks },
  { key: "progress", label: "প্রোগ্রেস", icon: LineChart },
];

export function TabNav({
  active,
  onChange,
  badge,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  /** Optional count shown on a tab, e.g. quizzes taken. */
  badge?: Partial<Record<TabKey, number>>;
}) {
  return (
    <div
      role="tablist"
      aria-label="অ্যাপের বিভাগ"
      className="flex items-center gap-1 rounded-2xl bg-neutral-100/80 p-1"
    >
      {TABS.map(({ key, label, icon: Icon }) => {
        const selected = key === active;
        const count = badge?.[key];
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13.5px] font-medium transition ${
              selected
                ? "bg-surface text-ink card-shadow"
                : "text-neutral-600 hover:bg-white/60 hover:text-ink"
            }`}
          >
            <Icon className={`size-4 ${selected ? "text-accent" : "text-muted"}`} />
            <span>{label}</span>
            {typeof count === "number" && count > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  selected ? "bg-accent-soft text-accent-strong" : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
