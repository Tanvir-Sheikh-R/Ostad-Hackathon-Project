"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ChapterBar } from "@/components/chapter-bar";
import { ChatComposer } from "@/components/chat-composer";
import { EmptyState } from "@/components/empty-state";
import { MessageList } from "@/components/message-list";
import { ProgressPanel } from "@/components/progress-panel";
import { QuizPanel } from "@/components/quiz-panel";
import { SelectionModal, type PickerMode, type PickerResult } from "@/components/selection-modal";
import { Sidebar } from "@/components/sidebar";
import type { TabKey } from "@/components/tab-nav";
import { LoadingScreen, ToastStack, type Toast } from "@/components/toast";
import { ApiError, api, apiBaseUrl, streamChat } from "@/lib/api";
import { CACHE_KEYS, readCache, writeCache } from "@/lib/cache";
import type {
  CatalogResponse,
  ChapterContext,
  ChatMessage,
  ThreadDetail,
  ThreadGroup,
} from "@/lib/types";
import { useLanguage } from "@/lib/use-language";
import { useUserName } from "@/lib/use-user-name";

type ModalState = {
  mode: PickerMode;
  initial: ChapterContext | null;
};

function toContext(detail: ThreadDetail): ChapterContext | null {
  const context = detail.context;
  if (
    !context.class_id ||
    !context.class_label ||
    !context.subject ||
    !context.subject_label ||
    !context.book ||
    !context.chapter
  ) {
    return null;
  }
  return {
    class_id: context.class_id,
    class_label: context.class_label,
    subject: context.subject,
    subject_label: context.subject_label,
    stream: context.stream ?? null,
    book: context.book,
    chapter: context.chapter,
    chapter_label: context.chapter_label,
  };
}

export default function Page() {
  const { language, setLanguage, t, tf } = useLanguage();
  const { userName, saveUserName } = useUserName(language);

  const [tab, setTab] = useState<TabKey>("chat");
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [groups, setGroups] = useState<ThreadGroup[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [context, setContext] = useState<ChapterContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [statusLabel, setStatusLabel] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    threadId: string;
    title: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  // Bumped after a quiz is graded so the progress tab refetches.
  const [progressKey, setProgressKey] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const toastIdRef = useRef(0);
  const pickerShownRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pushToast = useCallback(
    (tone: Toast["tone"], message: string, durationMs?: number) => {
      const id = ++toastIdRef.current;
      setToasts((current) => [...current, { id, tone, message, durationMs }].slice(-3));
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const refreshThreads = useCallback(async () => {
    try {
      setGroups(await api.threads());
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : tf("chat.listFailed"));
    } finally {
      setThreadsLoading(false);
    }
  }, [pushToast, tf]);

  const bootstrap = useCallback(async () => {
    // Paint from the cached catalog first: the picker and header render immediately,
    // then the network answer (often a 304) replaces it.
    const cached = readCache<CatalogResponse>(CACHE_KEYS.catalog);
    if (cached?.classes?.length) {
      setCatalog(cached);
      setReady(true);
    }

    setThreadsLoading(true);
    const requestedThread =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("thread")
        : null;

    try {
      // The catalog request doubles as the connectivity check: if it answers, the
      // backend is up. Nothing else is fetched on boot.
      const catalogResponse = await api.catalog(cached?.version);
      if (catalogResponse) {
        setCatalog(catalogResponse);
        writeCache(CACHE_KEYS.catalog, catalogResponse);
      }
      setReady(true);
      if (requestedThread) {
        const detail = await api.thread(requestedThread);
        setActiveThreadId(detail.thread_id);
        setMessages(detail.messages);
        setContext(toContext(detail));
        pickerShownRef.current = true;
      }
      void refreshThreads();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : tf("error.bootDefault");
      if (cached?.classes?.length) {
        // Still usable from cache — warn instead of blocking the whole app.
        pushToast("error", tf("error.cachedNotice", { message }));
      } else {
        setBootError(message);
      }
    } finally {
      setThreadsLoading(false);
    }
  }, [pushToast, refreshThreads, tf]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // The selection popup blocks the app until a class/subject/chapter is chosen.
  useEffect(() => {
    if (!ready || pickerShownRef.current || modal || activeThreadId) {
      return;
    }
    pickerShownRef.current = true;
    setModal({ mode: "new", initial: null });
  }, [activeThreadId, modal, ready]);

  // Keep the newest content in view: new messages and every streamed chunk.
  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, streamingText, statusLabel]);

  const startThread = useCallback(
    async (nextContext: ChapterContext) => {
      const created = await api.createThread(nextContext);
      setActiveThreadId(created.thread_id);
      setMessages(created.messages);
      setContext(toContext(created) ?? nextContext);
      await refreshThreads();
    },
    [refreshThreads],
  );

  const handlePickerSubmit = useCallback(
    async ({ context: picked, startFresh }: PickerResult) => {
      const mode: PickerMode = modal?.mode ?? "new";

      if (mode === "select") {
        // Quiz/progress only need the scope; no thread is created until the student asks.
        setContext(picked);
        setModal(null);
        return;
      }

      const switchTarget = mode === "switch" ? activeThreadId : null;
      if (!startFresh && switchTarget) {
        const updated = await api.updateContext(switchTarget, picked);
        setContext(toContext(updated) ?? picked);
        await refreshThreads();
      } else {
        await startThread(picked);
      }
      setModal(null);
      // A brand-new chat always opens on the chat tab.
      setTab("chat");
    },
    [activeThreadId, modal?.mode, refreshThreads, startThread],
  );

  const loadThread = useCallback(
    async (threadId: string) => {
      if (streaming) {
        return;
      }
      setThreadsLoading(true);
      try {
        const detail = await api.thread(threadId);
        setActiveThreadId(detail.thread_id);
        setMessages(detail.messages);
        setContext(toContext(detail));
        setStreamingText("");
        setStatusLabel(null);
        setNavOpen(false);
        setTab("chat");
      } catch (error) {
        pushToast("error", error instanceof Error ? error.message : tf("chat.loadFailed"));
      } finally {
        setThreadsLoading(false);
      }
    },
    [pushToast, streaming, tf],
  );

  const renameThread = useCallback(
    async (threadId: string, title: string) => {
      if (streaming) {
        pushToast("info", tf("chat.busyAnswer"));
        return;
      }
      try {
        await api.renameThread(threadId, title);
        await refreshThreads();
      } catch (error) {
        pushToast("error", error instanceof Error ? error.message : tf("chat.renameFailed"));
      }
    },
    [pushToast, refreshThreads, streaming, tf],
  );

  // Deleting asks in-app rather than with window.confirm(): a suppressed native
  // dialog silently answers "no" (or "yes"), which is worse than no warning at all.
  const requestDeleteThread = useCallback(
    (threadId: string) => {
      if (streaming) {
        pushToast("info", tf("chat.busyAnswer"));
        return;
      }
      const found = groups
        .flatMap((group) => group.threads)
        .find((thread) => thread.thread_id === threadId);
      setPendingDelete({ threadId, title: found?.title ?? "" });
    },
    [groups, pushToast, streaming, tf],
  );

  const confirmDeleteThread = useCallback(async () => {
    const target = pendingDelete;
    if (!target) {
      return;
    }
    setPendingDelete(null);
    const wasActive = target.threadId === activeThreadId;
    try {
      await api.deleteThread(target.threadId);
      if (wasActive) {
        // Back to the greeting in the same chapter. The thread is created again only
        // when the next question is sent, so no empty look-alike thread reappears.
        setActiveThreadId(null);
        setMessages([]);
        setStreamingText("");
        setStatusLabel(null);
      }
      await refreshThreads();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : tf("chat.deleteFailed"));
    }
  }, [activeThreadId, pendingDelete, pushToast, refreshThreads, tf]);

  const send = useCallback(async () => {
    const question = input.trim();
    if (!question || streaming) {
      return;
    }
    if (!context) {
      pushToast("error", tf("chat.needChapter"));
      return;
    }

    // After deleting the current chat (or before the first message) there is no thread
    // yet: create one now, with this question as its first turn, rather than eagerly
    // creating empty threads that clutter the sidebar.
    let threadId: string;
    if (activeThreadId) {
      threadId = activeThreadId;
    } else {
      try {
        const created = await api.createThread(context);
        threadId = created.thread_id;
        setActiveThreadId(threadId);
      } catch (error) {
        pushToast("error", error instanceof Error ? error.message : tf("chat.newThreadFailed"));
        return;
      }
    }

    setInput("");
    setStreamingText("");
    setStatusLabel(null);
    setStreaming(true);
    setMessages((current) => [...current, { role: "user", content: question }]);

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";
    let failed: string | null = null;

    try {
      for await (const event of streamChat(threadId, question, context, controller.signal)) {
        switch (event.type) {
          case "status":
            setStatusLabel(event.message);
            break;
          case "delta":
            answer += event.text;
            setStreamingText(answer);
            break;
          case "error":
            failed = event.message;
            break;
          case "done":
            break;
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        answer = answer || tf("chat.stopped");
      } else {
        failed = error instanceof Error ? error.message : tf("chat.answerFailed");
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      setStatusLabel(null);

      if (failed) {
        if (!answer) {
          answer = failed;
        }
        pushToast("error", failed);
      }
      if (answer) {
        setMessages((current) => [...current, { role: "assistant", content: answer }]);
      }
      setStreamingText("");
      void refreshThreads();
    }
  }, [activeThreadId, context, input, pushToast, refreshThreads, streaming, tf]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const openPicker = useCallback(
    (mode: PickerMode) => {
      if (streaming) {
        pushToast("info", tf("chat.busyAnswer"));
        return;
      }
      setModal({ mode, initial: mode === "new" ? null : context });
    },
    [context, pushToast, streaming, tf],
  );

  // Home: back to the greeting for the current chapter. The next question starts a
  // fresh thread, so no empty thread is created just by landing here.
  const goHome = useCallback(() => {
    if (streaming) {
      pushToast("info", tf("chat.busyAnswer"));
      return;
    }
    setTab("chat");
    if (!context) {
      openPicker("new");
      return;
    }
    setActiveThreadId(null);
    setMessages([]);
    setStreamingText("");
    setStatusLabel(null);
  }, [context, openPicker, pushToast, streaming, tf]);

  if (bootError && !ready) {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <div className="max-w-md rounded-3xl bg-surface p-6 text-center card-shadow">
          <h1 className="text-lg font-bold text-ink">{t("error.bootTitle")}</h1>
          <p className="pt-2 text-sm leading-relaxed text-neutral-600">{bootError}</p>
          <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-left text-[12px] leading-relaxed text-neutral-600">
            {t("error.backendBase")}
            <code className="break-all">{apiBaseUrl()}</code>
          </p>
          <p className="pt-2 text-xs leading-relaxed text-muted">{t("error.bootHelp")}</p>
          <button
            type="button"
            onClick={() => {
              setBootError(null);
              void bootstrap();
            }}
            className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {t("error.retry")}
          </button>
        </div>
      </main>
    );
  }

  if (!ready || !catalog) {
    return <LoadingScreen label={t("error.loadingBoot")} />;
  }

  const contextLabel = context
    ? `${context.class_label} · ${context.subject_label} · ${context.chapter_label ?? context.chapter}`
    : null;
  const currentSubject = context
    ? catalog.classes.flatMap((item) => item.subjects).find((item) => item.book === context.book)
    : undefined;
  const bookHint =
    currentSubject && !currentSubject.indexed ? t("picker.notIndexed") : null;

  const composer = (
    <ChatComposer
      value={input}
      busy={streaming}
      canStop={streaming}
      hint={contextLabel ?? undefined}
      onChange={setInput}
      onSend={() => void send()}
      onStop={stop}
      t={t}
    />
  );

  return (
    <main className="flex h-dvh flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4">
      <AppHeader
        tab={tab}
        onTabChange={setTab}
        language={language}
        onLanguageChange={setLanguage}
        userName={userName}
        onSaveName={saveUserName}
        onToggleNav={() => setNavOpen((open) => !open)}
        bannerSubtitle={contextLabel ?? t("app.description")}
        t={t}
      />

      <div className="flex min-h-0 flex-1 gap-2.5 sm:gap-3">
        <div
          className={`${navOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-30 h-full lg:static lg:flex`}
        >
          <div className="h-full overflow-hidden rounded-3xl bg-surface app-shadow">
            <Sidebar
              groups={groups}
              activeThreadId={activeThreadId}
              search={search}
              loading={threadsLoading}
              onSearchChange={setSearch}
              onSelectThread={(threadId) => void loadThread(threadId)}
              onHome={goHome}
              onRenameThread={(threadId, title) => void renameThread(threadId, title)}
              onDeleteThread={requestDeleteThread}
              t={t}
            />
          </div>
        </div>

        {navOpen ? (
          <button
            type="button"
            aria-label={t("picker.close")}
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-20 bg-neutral-900/20 lg:hidden"
          />
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-surface app-shadow">
          <ChapterBar
            context={context}
            onOpenPicker={() => openPicker("switch")}
            onNewChat={() => openPicker("new")}
            disabled={streaming}
            t={t}
          />

          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {tab === "chat" ? (
              messages.length === 0 ? (
                <EmptyState
                  userName={userName}
                  contextLabel={contextLabel}
                  hint={bookHint}
                  t={t}
                >
                  {composer}
                </EmptyState>
              ) : (
                <MessageList
                  messages={messages}
                  streamingText={streamingText}
                  statusLabel={statusLabel}
                />
              )
            ) : tab === "quiz" ? (
              <QuizPanel
                context={context}
                student={userName}
                onOpenPicker={() => openPicker("select")}
                onToast={pushToast}
                onSaved={() => setProgressKey((key) => key + 1)}
                onGoProgress={() => setTab("progress")}
                t={t}
              />
            ) : (
              <ProgressPanel
                student={userName}
                refreshKey={progressKey}
                onGoQuiz={() => setTab("quiz")}
                onToast={pushToast}
                t={t}
              />
            )}
          </div>

          {tab === "chat" && messages.length > 0 ? (
            <div className="mx-auto w-full max-w-3xl px-4 pb-4">{composer}</div>
          ) : null}
        </section>
      </div>

      {modal ? (
        <SelectionModal
          classes={catalog.classes}
          initialContext={modal.initial}
          mode={modal.mode}
          language={language}
          onCancel={() => setModal(null)}
          onSubmit={handlePickerSubmit}
          t={t}
        />
      ) : null}

      {pendingDelete ? (
        <div className="bb-fade-in fixed inset-0 z-50 grid place-items-center bg-neutral-900/30 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={t("chat.deleteTitle")}
            className="bb-slide-up w-full max-w-sm rounded-3xl bg-surface p-6 card-shadow"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-ink">{t("chat.deleteTitle")}</h2>
                <p className="truncate pt-1 text-[13px] text-neutral-600">{pendingDelete.title}</p>
                <p className="pt-2 text-[12px] leading-relaxed text-muted">
                  {t("chat.deleteBody")}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-100"
              >
                {t("chat.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteThread()}
                className="rounded-full bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-rose-700"
              >
                {t("chat.deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} t={t} />

      {/* Contact the developer. Pinned to the window's bottom-right corner; kept
          small and flush to the edge so it clears the composer's send button.
          Inline SVG because lucide no longer ships brand icons. */}
      <a
        href="https://www.linkedin.com/in/tanvir-sheikh-r/"
        target="_blank"
        rel="noreferrer"
        title="LinkedIn"
        aria-label="LinkedIn"
        className="fixed right-1 bottom-1 z-40 grid size-14 place-items-center rounded-full border border-neutral-200 bg-white text-muted shadow-lg transition hover:border-accent/50 hover:text-accent-strong"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className="size-6">
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3.2 9.25h3.56V21H3.2V9.25Zm6.1 0h3.41v1.6h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.45V21h-3.56v-5.63c0-1.34-.03-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.97V21H9.3V9.25Z" />
        </svg>
      </a>
    </main>
  );
}
