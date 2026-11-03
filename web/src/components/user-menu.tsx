"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { TFunction } from "@/lib/i18n";

/**
 * Header user chip. Clicking it opens a small popover with the current name and a
 * pencil that switches to an inline edit field; saving writes to localStorage.
 */
export function UserMenu({
  userName,
  onSaveName,
  t,
}: {
  userName: string;
  onSaveName: (name: string) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(userName);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(userName);
  }, [userName]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(userName);
    setEditing(true);
  }

  function commit() {
    const cleaned = draft.trim();
    if (cleaned) {
      onSaveName(cleaned);
    }
    setEditing(false);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setEditing(false);
        }}
        aria-label={t("user.menuLabel")}
        aria-expanded={open}
        title={userName}
        className="grid size-9 place-items-center rounded-full ring-2 ring-transparent transition hover:ring-accent/30"
      >
        <Avatar name={userName} />
      </button>

      {open ? (
        <div className="bb-slide-up absolute top-[calc(100%+8px)] right-0 z-50 w-64 rounded-2xl bg-surface p-3 card-shadow ring-1 ring-neutral-200">
          {editing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                commit();
              }}
            >
              <label className="block text-[11px] font-medium text-muted" htmlFor="user-name-input">
                {t("user.edit")}
              </label>
              <input
                id="user-name-input"
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("user.placeholder")}
                maxLength={40}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(userName);
                  }}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-neutral-600 transition hover:bg-neutral-100"
                >
                  {t("user.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                >
                  {t("user.save")}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar name={userName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{userName}</p>
                <p className="truncate text-[11px] text-muted">{t("user.hint")}</p>
              </div>
              <button
                type="button"
                onClick={startEditing}
                aria-label={t("user.edit")}
                title={t("user.edit")}
                className="rounded-lg p-1.5 text-muted transition hover:bg-neutral-100 hover:text-accent-strong"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("user.cancel")}
                className="rounded-lg p-1.5 text-muted transition hover:bg-neutral-100 hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
