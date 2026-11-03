"use client";

import { BookOpen, ChevronsUpDown, Plus } from "lucide-react";
import type { ChapterContext } from "@/lib/types";
import type { TFunction } from "@/lib/i18n";

/**
 * Slim toolbar under the header: the current chapter (click to change it) and a
 * "New chat" action. Kept out of the header row so the header stays a single clean line.
 */
export function ChapterBar({
  context,
  onOpenPicker,
  onNewChat,
  disabled,
  t,
}: {
  context: ChapterContext | null;
  onOpenPicker: () => void;
  onNewChat: () => void;
  disabled?: boolean;
  t: TFunction;
}) {
  const label = context
    ? `${context.chapter} · ${context.subject_label} · ${context.class_label}`
    : t("chapter.pick");

  return (
    <div className="flex items-center gap-2 border-b border-neutral-200/70 px-3 py-2 sm:px-4">
      <button
        type="button"
        onClick={onOpenPicker}
        title={t("chapter.switch")}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-neutral-100 py-1.5 pr-2.5 pl-2 transition hover:bg-neutral-200/70"
      >
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white text-accent">
          <BookOpen className="size-3" />
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-ink">
          {label}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted" />
      </button>

      <button
        type="button"
        onClick={onNewChat}
        disabled={disabled}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
      >
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">{t("chat.newChat")}</span>
      </button>
    </div>
  );
}
