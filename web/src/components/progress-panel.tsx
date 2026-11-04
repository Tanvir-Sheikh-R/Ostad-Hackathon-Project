"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  LineChart,
  Loader2,
  RefreshCw,
  RotateCcw,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { currentLanguage, type TFunction } from "@/lib/i18n";
import type { Progress, ProgressSummary } from "@/lib/types";

/** What a pending reset will delete. */
type ResetTarget =
  | { scope: "chapter"; subject: string; chapter: string; label: string }
  | { scope: "all"; label: string };

function accuracyTone(accuracy: number): { bar: string; text: string } {
  if (accuracy >= 80) return { bar: "bg-emerald-500", text: "text-emerald-700" };
  if (accuracy >= 50) return { bar: "bg-amber-500", text: "text-amber-700" };
  return { bar: "bg-rose-500", text: "text-rose-700" };
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  const locale = currentLanguage() === "bn" ? "bn-BD" : "en-GB";
  return parsed.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function ProgressPanel({
  student,
  refreshKey,
  onGoQuiz,
  onToast,
  t,
}: {
  student: string;
  /** Bumped by the quiz tab after a graded attempt, so this panel refetches. */
  refreshKey: number;
  onGoQuiz: () => void;
  onToast: (tone: "error" | "info", message: string, durationMs?: number) => void;
  t: TFunction;
}) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped to force a refetch (retry button, or after a reset).
  const [attempt, setAttempt] = useState(0);
  /** Subject filter: null means "all subjects". */
  const [subject, setSubject] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ResetTarget | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadSummary = useCallback(
    async (filter: string | null) => {
      setSummaryLoading(true);
      try {
        setSummary(await api.summary(student, filter));
      } catch (failure) {
        onToast(
          "error",
          failure instanceof ApiError ? failure.message : t("progress.summaryFailed"),
        );
      } finally {
        setSummaryLoading(false);
      }
    },
    [onToast, student, t],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const loaded = await api.progress(student, subject);
        if (cancelled) {
          return;
        }
        setProgress(loaded);
        setLoading(false);
        // The selected subject disappeared (e.g. its results were just reset).
        if (subject && !loaded.subjects.some((item) => item.subject === subject)) {
          setSubject(null);
          return;
        }
        if (loaded.overall.questions > 0) {
          await loadSummary(subject);
        } else {
          setSummary(null);
        }
      } catch (failure) {
        if (cancelled) {
          return;
        }
        setError(failure instanceof ApiError ? failure.message : t("progress.loadFailed"));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, loadSummary, refreshKey, student, subject, t]);

  const performReset = useCallback(async () => {
    const target = confirm;
    if (!target || resetting) {
      return;
    }
    setResetting(true);
    try {
      const result =
        target.scope === "chapter"
          ? await api.resetChapter(student, target.subject, target.chapter)
          : await api.resetAll(student);
      setConfirm(null);
      setSummary(null);
      onToast("info", t("progress.resetDone", { count: result.deleted }), 2500);
      setAttempt((current) => current + 1);
    } catch (failure) {
      onToast(
        "error",
        failure instanceof ApiError ? failure.message : t("progress.resetFailed"),
      );
    } finally {
      setResetting(false);
    }
  }, [confirm, onToast, resetting, student, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-20 text-sm text-neutral-600">
        <Loader2 className="size-4 animate-spin text-emerald-600" />
        {t("progress.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[13px] leading-relaxed text-rose-800 ring-1 ring-rose-200">
          {error}
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAttempt((current) => current + 1);
          }}
          className="mt-4 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white"
        >
          {t("progress.retry")}
        </button>
      </div>
    );
  }

  const overall = progress?.overall;
  const subjects = progress?.subjects ?? [];
  const hasData = Boolean(overall && overall.questions > 0);

  if (!hasData && subjects.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <LineChart className="size-5" />
        </span>
        <h2 className="pt-4 text-base font-bold text-ink">{t("progress.emptyTitle")}</h2>
        <p className="max-w-sm pt-1 text-[13px] leading-relaxed text-neutral-600">
          {t("progress.emptyBody", { name: student })}
        </p>
        <button
          type="button"
          onClick={onGoQuiz}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-neutral-800"
        >
          {t("progress.goQuiz")}
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    );
  }

  const chapters = progress?.chapters ?? [];
  const weakTopics = progress?.weak_topics ?? [];
  const bestChapter = chapters[0];
  const worstChapter = chapters[chapters.length - 1];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <LineChart className="size-3.5" />
            {t("progress.title", { name: student })}
          </p>
          <h2 className="text-base font-bold text-ink">
            {t("progress.overallAccuracy", { accuracy: overall?.accuracy ?? 0 })}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void loadSummary(subject)}
            disabled={summaryLoading}
            title={t("progress.refreshSummary")}
            className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-2 text-[12.5px] font-medium text-ink transition hover:bg-neutral-200 disabled:opacity-60"
          >
            {summaryLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            <span className="hidden sm:inline">{t("progress.refreshSummary")}</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirm({ scope: "all", label: t("progress.resetAllTarget") })}
            title={t("progress.resetAll")}
            className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">{t("progress.resetAll")}</span>
          </button>
        </div>
      </header>

      {subjects.length > 1 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="pr-1 text-[11px] font-medium text-muted">
            {t("progress.subjectFilter")}
          </span>
          <Chip active={subject === null} onClick={() => setSubject(null)}>
            {t("progress.allSubjects")}
          </Chip>
          {subjects.map((item) => (
            <Chip
              key={item.subject}
              active={subject === item.subject}
              onClick={() => setSubject(item.subject)}
              title={t("progress.subjectChipTitle", {
                label: item.subject_label || item.subject,
                quizzes: item.quiz_count,
                questions: item.questions,
              })}
            >
              {item.subject_label || item.subject}
              <span className="pl-1 text-[10.5px] opacity-70">{item.quiz_count}</span>
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={t("progress.stat.quizzes")} value={String(overall?.quiz_count ?? 0)} />
        <Stat label={t("progress.stat.questions")} value={String(overall?.questions ?? 0)} />
        <Stat label={t("progress.stat.correct")} value={String(overall?.correct ?? 0)} />
        <Stat label={t("progress.stat.accuracy")} value={`${overall?.accuracy ?? 0}%`} accent />
      </div>

      <section className="mt-4 rounded-2xl bg-surface p-4 card-shadow">
        <h3 className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
          <Target className="size-4 text-emerald-600" />
          {t("progress.perChapter")}
        </h3>
        <div className="mt-3 space-y-2.5">
          {chapters.map((chapter) => {
            const tone = accuracyTone(chapter.accuracy);
            return (
              <div key={`${chapter.subject}-${chapter.chapter}`} className="group">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-[13px] text-ink">
                    {chapter.chapter_label || chapter.chapter}
                    <span className="pl-1.5 text-[11px] text-muted">
                      {chapter.subject_label || chapter.subject}
                    </span>
                  </p>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className={`text-[12.5px] font-semibold ${tone.text}`}>
                      {chapter.accuracy}%
                      <span className="pl-1 font-normal text-muted">
                        {t("progress.chapterMeta", {
                          correct: chapter.correct,
                          questions: chapter.questions,
                          quizzes: chapter.quiz_count,
                        })}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          scope: "chapter",
                          subject: chapter.subject,
                          chapter: chapter.chapter,
                          label: `${chapter.chapter_label || chapter.chapter} · ${
                            chapter.subject_label || chapter.subject
                          }`,
                        })
                      }
                      title={t("progress.resetChapter")}
                      aria-label={t("progress.resetChapterAria", {
                        chapter: chapter.chapter_label || chapter.chapter,
                      })}
                      className="rounded-md p-1 text-muted opacity-40 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${Math.max(3, Math.min(100, chapter.accuracy))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {bestChapter && worstChapter && bestChapter.chapter !== worstChapter.chapter ? (
          <div className="mt-3 grid gap-2 border-t border-neutral-100 pt-3 sm:grid-cols-2">
            <p className="flex items-center gap-1.5 text-[12px] text-emerald-700">
              <TrendingUp className="size-3.5" />
              {t("progress.best", {
                chapter: bestChapter.chapter_label || bestChapter.chapter,
                accuracy: bestChapter.accuracy,
              })}
            </p>
            <p className="flex items-center gap-1.5 text-[12px] text-rose-700">
              <TrendingDown className="size-3.5" />
              {t("progress.weakest", {
                chapter: worstChapter.chapter_label || worstChapter.chapter,
                accuracy: worstChapter.accuracy,
              })}
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 card-shadow">
        <h3 className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
          <TrendingDown className="size-4 text-rose-500" />
          {t("progress.weakTopics")}
        </h3>
        {weakTopics.length === 0 ? (
          <p className="pt-2 text-[12.5px] leading-relaxed text-neutral-600">
            {t("progress.noWeak")}
          </p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {weakTopics.map((topic) => (
              <li
                key={`${topic.chapter}-${topic.topic}`}
                className="flex items-start justify-between gap-2 rounded-xl bg-rose-50/60 px-3 py-2 ring-1 ring-rose-100"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-rose-900">{topic.topic}</p>
                  <p className="truncate text-[11.5px] text-rose-700/80">
                    {topic.chapter_label || topic.chapter}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] font-semibold text-rose-800">
                  {topic.correct}/{topic.questions}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 card-shadow">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13.5px] font-bold text-ink">{t("progress.parentSummary")}</h3>
          {summary ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                summary.source === "llm"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {summary.source === "llm" ? t("progress.aiWritten") : t("progress.fromNumbers")}
            </span>
          ) : null}
        </div>
        {summaryLoading && !summary ? (
          <p className="flex items-center gap-2 pt-3 text-[12.5px] text-muted">
            <Loader2 className="size-3.5 animate-spin" /> {t("progress.summaryLoading")}
          </p>
        ) : (
          <p className="pt-2.5 text-[13px] leading-[1.9] whitespace-pre-line text-neutral-700">
            {summary?.summary ?? t("progress.summaryMissing")}
          </p>
        )}
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 card-shadow">
        <h3 className="text-[13.5px] font-bold text-ink">{t("progress.recent")}</h3>
        <ul className="mt-2 divide-y divide-neutral-100">
          {(progress?.recent ?? []).map((attemptItem) => (
            <li
              key={attemptItem.quiz_id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-ink">
                  {attemptItem.chapter_label || attemptItem.chapter}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {attemptItem.subject_label || attemptItem.subject} ·{" "}
                  {formatDate(attemptItem.created_at)}
                </p>
              </div>
              <span
                className={`shrink-0 text-[12.5px] font-semibold ${
                  accuracyTone(attemptItem.score * 100).text
                }`}
              >
                {attemptItem.correct}/{attemptItem.questions}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {confirm ? (
        <div className="bb-fade-in fixed inset-0 z-50 grid place-items-center bg-neutral-900/30 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={
              confirm.scope === "all" ? t("progress.resetTitleAll") : t("progress.resetTitleChapter")
            }
            className="bb-slide-up w-full max-w-sm rounded-3xl bg-surface p-6 card-shadow"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-ink">
                  {confirm.scope === "all"
                    ? t("progress.resetTitleAll")
                    : t("progress.resetTitleChapter")}
                </h2>
                <p className="truncate pt-1 text-[13px] text-neutral-600">{confirm.label}</p>
                <p className="pt-2 text-[12px] leading-relaxed text-muted">
                  {t("progress.resetBody", { target: confirm.label })}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={resetting}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-100"
              >
                {t("progress.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void performReset()}
                disabled={resetting}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300"
              >
                {resetting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                {t("progress.resetConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-2.5 card-shadow">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`pt-0.5 text-base font-bold ${accent ? "text-emerald-700" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
