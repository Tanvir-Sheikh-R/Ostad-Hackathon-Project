"use client";

import { GradientOrb } from "@/components/gradient-orb";
import type { TFunction } from "@/lib/i18n";

export function EmptyState({
  userName,
  contextLabel,
  hint,
  t,
  children,
}: {
  userName: string;
  contextLabel: string | null;
  hint: string | null;
  t: TFunction;
  children: React.ReactNode;
}) {
  const hour = new Date().getHours();
  const greetingKey =
    hour < 6
      ? "chat.greetingNight"
      : hour < 12
        ? "chat.greetingMorning"
        : hour < 16
          ? "chat.greetingAfternoon"
          : hour < 19
            ? "chat.greetingEvening"
            : "chat.greetingNight";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-10">
      <GradientOrb />

      <h1 className="pt-6 text-center text-2xl leading-snug font-bold text-ink sm:text-[29px]">
        {t("chat.greeting", { greeting: t(greetingKey), name: userName })}
      </h1>
      <p className="pt-1 text-center text-2xl leading-snug font-bold sm:text-[29px]">
        <span className="text-accent">{t("chat.askLine")}</span>
      </p>

      {/* {contextLabel ? (
        <p className="pt-3 text-center text-xs text-muted">{contextLabel}</p>
      ) : null} */}
      {hint ? (
        <p className="max-w-md pt-2 text-center text-xs leading-relaxed text-amber-700">{hint}</p>
      ) : null}

      <div className="w-full pt-6">{children}</div>
    </div>
  );
}
