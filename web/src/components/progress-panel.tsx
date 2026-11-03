"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  LineChart,
  Loader2,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Progress, ProgressSummary } from "@/lib/types";

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
  return parsed.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
}

export function ProgressPanel({
  student,
  refreshKey,
  onGoQuiz,
  onToast,
}: {
  student: string;
  /** Bumped by the quiz tab after a graded attempt, so this panel refetches. */
  refreshKey: number;
  onGoQuiz: () => void;
  onToast: (tone: "error" | "info", message: string) => void;
}) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped by the retry button so the effect below runs again.
  const [attempt, setAttempt] = useState(0);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await api.summary(student));
    } catch (failure) {
      const message =
        failure instanceof ApiError ? failure.message : "অভিভাবকের সারসংক্ষেপ আনা যায়নি।";
      onToast("error", message);
    } finally {
      setSummaryLoading(false);
    }
  }, [onToast, student]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const loaded = await api.progress(student);
        if (cancelled) {
          return;
        }
        setProgress(loaded);
        setLoading(false);
        if (loaded.overall.questions > 0) {
          await loadSummary();
        } else {
          setSummary(null);
        }
      } catch (failure) {
        if (cancelled) {
          return;
        }
        const message =
          failure instanceof ApiError ? failure.message : "প্রোগ্রেস আনা যায়নি, আবার চেষ্টা করুন।";
        setError(message);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, loadSummary, refreshKey, student]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-20 text-sm text-neutral-600">
        <Loader2 className="size-4 animate-spin text-accent" />
        অগ্রগতি লোড হচ্ছে...
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
          আবার চেষ্টা করো
        </button>
      </div>
    );
  }

  const overall = progress?.overall;
  const hasData = Boolean(overall && overall.questions > 0);

  if (!hasData) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <LineChart className="size-5" />
        </span>
        <h2 className="pt-4 text-base font-bold text-ink">এখনো কোনো ফলাফল নেই</h2>
        <p className="max-w-sm pt-1 text-[13px] leading-relaxed text-neutral-600">
          {student}-এর প্রথম কুইজ দিলেই এখানে অধ্যায়ভিত্তিক স্কোর, দুর্বল বিষয় ও অভিভাবকের জন্য
          সারসংক্ষেপ দেখা যাবে।
        </p>
        <button
          type="button"
          onClick={onGoQuiz}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-neutral-800"
        >
          কুইজে যাও
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <LineChart className="size-3.5" />
            {student} · অগ্রগতি রিপোর্ট
          </p>
          <h2 className="text-base font-bold text-ink">
            মোট নির্ভুলতা {overall?.accuracy ?? 0}%
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void loadSummary()}
          disabled={summaryLoading}
          className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-neutral-200 disabled:opacity-60"
        >
          {summaryLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          সারসংক্ষেপ হালনাগাদ
        </button>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="কুইজ" value={String(overall?.quiz_count ?? 0)} />
        <Stat label="প্রশ্ন" value={String(overall?.questions ?? 0)} />
        <Stat label="সঠিক" value={String(overall?.correct ?? 0)} />
        <Stat label="নির্ভুলতা" value={`${overall?.accuracy ?? 0}%`} accent />
      </div>

      <section className="mt-4 rounded-2xl bg-surface p-4 card-shadow">
        <h3 className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
          <Target className="size-4 text-accent" />
          অধ্যায়ভিত্তিক স্কোর
        </h3>
        <div className="mt-3 space-y-2.5">
          {chapters.map((chapter) => {
            const tone = accuracyTone(chapter.accuracy);
            return (
              <div key={`${chapter.subject}-${chapter.chapter}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-[13px] text-ink">
                    {chapter.chapter}
                    <span className="pl-1.5 text-[11px] text-muted">
                      {chapter.subject_label || chapter.subject}
                    </span>
                  </p>
                  <p className={`shrink-0 text-[12.5px] font-semibold ${tone.text}`}>
                    {chapter.accuracy}%
                    <span className="pl-1 font-normal text-muted">
                      ({chapter.correct}/{chapter.questions} · {chapter.quiz_count} কুইজ)
                    </span>
                  </p>
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
              সবচেয়ে ভালো: {bestChapter.chapter} ({bestChapter.accuracy}%)
            </p>
            <p className="flex items-center gap-1.5 text-[12px] text-rose-700">
              <TrendingDown className="size-3.5" />
              সবচেয়ে দুর্বল: {worstChapter.chapter} ({worstChapter.accuracy}%)
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 card-shadow">
        <h3 className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
          <TrendingDown className="size-4 text-rose-500" />
          দুর্বল বিষয়
        </h3>
        {weakTopics.length === 0 ? (
          <p className="pt-2 text-[12.5px] leading-relaxed text-neutral-600">
            এখনো কোনো স্পষ্ট দুর্বলতা ধরা পড়েনি — চালিয়ে যাও!
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
                  <p className="truncate text-[11.5px] text-rose-700/80">{topic.chapter}</p>
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
          <h3 className="text-[13.5px] font-bold text-ink">অভিভাবকের জন্য সারসংক্ষেপ</h3>
          {summary ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                summary.source === "llm"
                  ? "bg-accent-soft text-accent-strong"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {summary.source === "llm" ? "AI-লিখিত" : "হিসাব থেকে"}
            </span>
          ) : null}
        </div>
        {summaryLoading && !summary ? (
          <p className="flex items-center gap-2 pt-3 text-[12.5px] text-muted">
            <Loader2 className="size-3.5 animate-spin" /> সারসংক্ষেপ লেখা হচ্ছে...
          </p>
        ) : (
          <p className="pt-2.5 text-[13px] leading-[1.9] whitespace-pre-line text-neutral-700">
            {summary?.summary ?? "সারসংক্ষেপ তৈরি হয়নি — “সারসংক্ষেপ হালনাগাদ” চাপো।"}
          </p>
        )}
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 card-shadow">
        <h3 className="text-[13.5px] font-bold text-ink">সাম্প্রতিক কুইজ</h3>
        <ul className="mt-2 divide-y divide-neutral-100">
          {(progress?.recent ?? []).map((attempt) => (
            <li key={attempt.quiz_id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-ink">{attempt.chapter}</p>
                <p className="truncate text-[11px] text-muted">
                  {attempt.subject_label || attempt.subject} · {formatDate(attempt.created_at)}
                </p>
              </div>
              <span
                className={`shrink-0 text-[12.5px] font-semibold ${
                  accuracyTone(attempt.score * 100).text
                }`}
              >
                {attempt.correct}/{attempt.questions}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-2.5 card-shadow">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`pt-0.5 text-base font-bold ${accent ? "text-accent-strong" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
