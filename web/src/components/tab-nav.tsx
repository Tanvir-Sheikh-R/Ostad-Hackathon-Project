"use client";

import { LineChart, ListChecks, MessageSquareText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TFunction } from "@/lib/i18n";

export type TabKey = "chat" | "quiz" | "progress";

/**
 * Each tab owns a colour: the active tab is filled with it, inactive tabs keep a light
 * tint of the same hue so the destination is recognisable before it is selected.
 */
const TABS: {
  key: TabKey;
  labelKey: "tab.chat" | "tab.quiz" | "tab.progress";
  icon: LucideIcon;
  active: string;
  inactive: string;
  dot: string;
}[] = [
  {
    key: "chat",
    labelKey: "tab.chat",
    icon: MessageSquareText,
    active: "bg-accent text-white shadow-sm",
    inactive: "bg-accent-soft/70 text-accent-strong hover:bg-accent-soft",
    dot: "bg-accent",
  },
  {
    key: "quiz",
    labelKey: "tab.quiz",
    icon: ListChecks,
    active: "bg-amber-500 text-white shadow-sm",
    inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    dot: "bg-amber-500",
  },
  {
    key: "progress",
    labelKey: "tab.progress",
    icon: LineChart,
    active: "bg-emerald-600 text-white shadow-sm",
    inactive: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    dot: "bg-emerald-600",
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
      className={`flex items-center gap-1 ${className}`}
    >
      {TABS.map(({ key, labelKey, icon: Icon, active: activeClass, inactive, dot }) => {
        const selected = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-semibold transition ${
              selected ? activeClass : inactive
            }`}
          >
            <Icon className="size-3.5" />
            <span>{t(labelKey)}</span>
            {selected ? null : <span className={`size-1.5 rounded-full ${dot} opacity-60`} />}
          </button>
        );
      })}
    </div>
  );
}
