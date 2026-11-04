"use client";

import { LineChart, ListChecks, MessageSquareText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TFunction } from "@/lib/i18n";

export type TabKey = "chat" | "quiz" | "progress";

/**
 * Each tab keeps its own colour, but as an accent rather than a filled box: the active
 * tab is tinted text plus a line under it, inactive tabs stay neutral.
 */
const TABS: {
  key: TabKey;
  labelKey: "tab.chat" | "tab.quiz" | "tab.progress";
  icon: LucideIcon;
  activeText: string;
  line: string;
}[] = [
  {
    key: "chat",
    labelKey: "tab.chat",
    icon: MessageSquareText,
    activeText: "text-accent-strong",
    line: "bg-accent",
  },
  {
    key: "quiz",
    labelKey: "tab.quiz",
    icon: ListChecks,
    activeText: "text-amber-700",
    line: "bg-amber-500",
  },
  {
    key: "progress",
    labelKey: "tab.progress",
    icon: LineChart,
    activeText: "text-emerald-700",
    line: "bg-emerald-600",
  },
];

export function TabNav({
  active,
  onChange,
  t,
  className = "",
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  t: TFunction;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={t("tab.aria")}
      className={`flex items-end gap-1 ${className}`}
    >
      {TABS.map(({ key, labelKey, icon: Icon, activeText, line }) => {
        const selected = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-semibold transition ${
              selected ? activeText : "text-neutral-500 hover:text-ink"
            }`}
          >
            <Icon className="size-4" />
            <span>{t(labelKey)}</span>
            <span
              aria-hidden
              className={`absolute inset-x-2 bottom-0 h-[2.5px] rounded-full transition-opacity ${
                selected ? `${line} opacity-100` : "opacity-0"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
