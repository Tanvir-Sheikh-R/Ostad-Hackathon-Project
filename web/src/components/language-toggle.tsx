"use client";

import type { Language, TFunction } from "@/lib/i18n";

const OPTIONS: { value: Language; key: "lang.en" | "lang.bn" }[] = [
  { value: "en", key: "lang.en" },
  { value: "bn", key: "lang.bn" },
];

/** EN / বাংলা switch in the header; the choice is persisted by useLanguage. */
export function LanguageToggle({
  language,
  onChange,
  t,
}: {
  language: Language;
  onChange: (language: Language) => void;
  t: TFunction;
}) {
  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className="flex shrink-0 items-center gap-0.5 rounded-full bg-neutral-100 p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = option.value === language;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition ${
              active
                ? "bg-surface text-ink card-shadow"
                : "text-muted hover:bg-white/60 hover:text-ink"
            }`}
          >
            {t(option.key)}
          </button>
        );
      })}
    </div>
  );
}
