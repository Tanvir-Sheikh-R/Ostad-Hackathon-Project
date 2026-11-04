"use client";

import { useState } from "react";
import { Home, Loader2, MessageSquare, Pencil, Search, Trash2 } from "lucide-react";
import type { TFunction } from "@/lib/i18n";
import type { ThreadGroup } from "@/lib/types";

export function Sidebar({
  groups,
  activeThreadId,
  search,
  loading,
  onSearchChange,
  onSelectThread,
  onHome,
  onRenameThread,
  onDeleteThread,
  t,
}: {
  groups: ThreadGroup[];
  activeThreadId: string | null;
  search: string;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onSelectThread: (threadId: string) => void;
  onHome: () => void;
  onRenameThread: (threadId: string, currentTitle: string) => void;
  onDeleteThread: (threadId: string) => void;
  t: TFunction;
}) {
  const query = search.trim().toLowerCase();

  // Renaming happens inline in the row: a browser prompt() can be suppressed by the
  // user (Chrome's "prevent additional dialogs"), which made renaming silently fail.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function beginRename(threadId: string, currentTitle: string) {
    setEditingId(threadId);
    setDraft(currentTitle);
  }

  function cancelRename() {
    setEditingId(null);
    setDraft("");
  }

  function commitRename() {
    const threadId = editingId;
    if (!threadId) {
      return;
    }
    const title = draft.trim();
    setEditingId(null);
    setDraft("");
    if (title) {
      onRenameThread(threadId, title);
    }
  }

  const visibleGroups = groups
    .map((group) => ({
      label: group.label,
      threads: query
        ? group.threads.filter(
            (thread) =>
              thread.title.toLowerCase().includes(query) ||
              thread.preview.toLowerCase().includes(query),
          )
        : group.threads,
    }))
    .filter((group) => group.threads.length > 0);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-surface">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-2 transition focus-within:bg-neutral-50 focus-within:ring-2 focus-within:ring-accent/25">
          <Search className="size-3.5 shrink-0 text-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("sidebar.search")}
            aria-label={t("sidebar.searchAria")}
            className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <nav className="mt-3 px-3">
        <button
          type="button"
          onClick={onHome}
          className="flex w-full items-center gap-2.5 rounded-xl bg-neutral-100 px-2.5 py-2 text-left text-[14px] font-medium text-ink transition hover:bg-neutral-200/70"
        >
          <Home className="size-4 shrink-0 text-accent" />
          <span className="flex-1">{t("sidebar.home")}</span>
        </button>
      </nav>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="px-5 pb-2">
          <span className="text-[12px] font-medium tracking-wide text-muted">
            {t("sidebar.chats")}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <p className="flex items-center gap-2 px-2 py-3 text-xs text-muted">
              <Loader2 className="size-3.5 animate-spin" /> {t("sidebar.loading")}
            </p>
          ) : visibleGroups.length === 0 ? (
            <p className="px-2 py-3 text-xs leading-relaxed text-muted">
              {query ? t("sidebar.nothingFound") : t("sidebar.empty")}
            </p>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-2 pb-1.5 text-[12px] text-muted">{group.label}</p>
                <div className="space-y-0.5">
                  {group.threads.map((thread) => {
                    const active = thread.thread_id === activeThreadId;
                    const editing = editingId === thread.thread_id;
                    return (
                      <div
                        key={thread.thread_id}
                        className={`group flex items-center gap-0.5 rounded-xl pr-1 transition ${
                          active ? "bg-accent-soft" : "hover:bg-neutral-100"
                        }`}
                      >
                        {editing ? (
                          <div className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2.5">
                            <MessageSquare className="size-3.5 shrink-0 text-accent" />
                            <input
                              autoFocus
                              value={draft}
                              onChange={(event) => setDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  commitRename();
                                } else if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelRename();
                                }
                              }}
                              onBlur={commitRename}
                              aria-label={t("sidebar.rename")}
                              className="min-w-0 flex-1 rounded-md border border-accent/50 bg-white px-1.5 py-0.5 text-[13.5px] text-ink outline-none"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectThread(thread.thread_id)}
                            title={thread.title}
                            className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl py-2 pl-2.5 text-left text-[13.5px] ${
                              active ? "text-accent-strong" : "text-neutral-600 hover:text-ink"
                            }`}
                          >
                            <MessageSquare
                              className={`size-3.5 shrink-0 ${active ? "text-accent" : "text-muted"}`}
                            />
                            <span className="truncate">{thread.title}</span>
                          </button>
                        )}
                        <span className="flex shrink-0 items-center opacity-40 transition group-focus-within:opacity-100 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => beginRename(thread.thread_id, thread.title)}
                            title={t("sidebar.rename")}
                            aria-label={t("sidebar.renameAria", { title: thread.title })}
                            className="rounded-md p-1 text-muted transition hover:bg-white hover:text-accent-strong"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteThread(thread.thread_id)}
                            title={t("sidebar.delete")}
                            aria-label={t("sidebar.deleteAria", { title: thread.title })}
                            className="rounded-md p-1 text-muted transition hover:bg-white hover:text-rose-600"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
