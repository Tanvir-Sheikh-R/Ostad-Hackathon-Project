"use client";

import { ArrowUp, ListChecks, Loader2, ScrollText, Sparkle, Sparkles, Square } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TFunction } from "@/lib/i18n";

export function ChatComposer({
  value,
  busy,
  canStop,
  hint,
  onChange,
  onSend,
  onStop,
  t,
}: {
  value: string;
  busy: boolean;
  canStop: boolean;
  hint?: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  t: TFunction;
}) {
  const disabled = value.trim().length === 0 || busy;

  const quickActions: { label: string; prompt: string; icon: LucideIcon }[] = [
    {
      label: t("chat.quick.summary"),
      prompt: t("chat.quick.summaryPrompt"),
      icon: ScrollText,
    },
    {
      label: t("chat.quick.quiz"),
      prompt: t("chat.quick.quizPrompt"),
      icon: ListChecks,
    },
    {
      label: t("chat.quick.explain"),
      prompt: t("chat.quick.explainPrompt"),
      icon: Sparkle,
    },
  ];

  return (
    <div className="rounded-3xl bg-surface p-4 card-shadow">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!disabled) {
                onSend();
              }
            }
          }}
          rows={2}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.questionAria")}
          className="max-h-40 min-h-[52px] flex-1 resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-muted"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onChange(action.prompt)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-[12.5px] text-neutral-600 transition hover:border-accent/40 hover:text-accent-strong"
            >
              <Icon className="size-3" />
              {action.label}
            </button>
          );
        })}

        <div className="flex flex-1 items-center justify-end gap-2">
          {hint ? <span className="truncate text-[12px] text-muted">{hint}</span> : null}
          {canStop ? (
            <button
              type="button"
              onClick={onStop}
              title={t("chat.stop")}
              aria-label={t("chat.stop")}
              className="grid size-9 place-items-center rounded-full bg-accent text-white transition hover:bg-accent-strong"
            >
              <Square className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={disabled}
              title={t("chat.send")}
              aria-label={t("chat.send")}
              className="grid size-9 place-items-center rounded-full bg-accent text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-muted"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
