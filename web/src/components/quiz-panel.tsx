"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleX,
  Loader2,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { TFunction } from "@/lib/i18n";
import type { ChapterContext, Quiz, QuizGrade } from "@/lib/types";

const QUESTION_COUNT = 5;
/** The "Result saved" confirmation hides itself after two seconds. */
const SAVED_TOAST_MS = 2000;

export function QuizPanel({
  context,
  student,
  onOpenPicker,
  onToast,
  onSaved,
  onGoProgress,
  t,
}: {
  context: ChapterContext | null;
  student: string;
  onOpenPicker: () => void;
  onToast: (tone: "error" | "info", message: string, durationMs?: number) => void;
  /** Called after a graded attempt is stored, so the progress tab can refresh. */
  onSaved: () => void;
  onGoProgress: () => void;
  t: TFunction;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [grade, setGrade] = useState<QuizGrade | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextKey = context ? `${context.book}::${context.chapter}` : "";

  // Changing the chapter invalidates any quiz that was generated for the old one.
  useEffect(() => {
    setQuiz(null);
    setGrade(null);
    setAnswers([]);
    setError(null);
  }, [contextKey]);

  const generate = useCallback(async () => {
    if (!context || generating) {
      return;
    }
    setGenerating(true);
    setError(null);
    setGrade(null);
    try {
      const created = await api.generateQuiz(context, student, QUESTION_COUNT);
      setQuiz(created);
      setAnswers(Array.from({ length: created.questions.length }, () => null));
    } catch (failure) {
      const message = failure instanceof ApiError ? failure.message : t("quiz.generateFailed");
      setError(message);
      onToast("error", message);
    } finally {
      setGenerating(false);
    }
  }, [context, generating, onToast, student, t]);

  const choose = useCallback((questionIndex: number, optionIndex: number) => {
    setAnswers((current) => {
      const next = [...current];
      // Clicking the selected option clears it, so a mis-click is recoverable.
      next[questionIndex] = next[questionIndex] === optionIndex ? null : optionIndex;
      return next;
    });
  }, []);

  const answered = answers.filter((value) => value !== null).length;
  const allAnswered = quiz ? answered === quiz.questions.length : false;

  const submit = useCallback(async () => {
    if (!quiz || submitting || !allAnswered) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const graded = await api.submitQuiz(quiz.quiz_id, student, answers);
      setGrade(graded);
      onSaved();
      onToast("info", t("quiz.saved"), SAVED_TOAST_MS);
    } catch (failure) {
      const message = failure instanceof ApiError ? failure.message : t("quiz.submitFailed");
      setError(message);
      onToast("error", message);
    } finally {
      setSubmitting(false);
    }
  }, [allAnswered, answers, onSaved, onToast, quiz, student, submitting, t]);

  if (!context) {
    return (
      <Notice
        title={t("quiz.needChapterTitle")}
        body={t("quiz.needChapterBody")}
        action={{ label: t("quiz.needChapterAction"), onClick: onOpenPicker }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <BookOpen className="size-3.5" />
            {context.subject_label} · {context.class_label}
          </p>
          <h2 className="truncate text-base font-bold text-ink">{context.chapter}</h2>
        </div>
        {grade ? (
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {t("quiz.newQuiz")}
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[13px] leading-relaxed text-rose-800 ring-1 ring-rose-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {grade ? (
        <ResultView
          grade={grade}
          onRetry={() => void generate()}
          onGoProgress={onGoProgress}
          generating={generating}
          t={t}
        />
      ) : quiz ? (
        <div className="mt-4 space-y-3">
          <p className="text-[12px] text-muted">
            {t("quiz.hint", {
              count: quiz.questions.length,
              answered,
            })}
          </p>

          {quiz.questions.map((question, questionIndex) => (
            <article key={question.id} className="rounded-2xl bg-surface p-4 card-shadow">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-amber-100 text-[12px] font-semibold text-amber-800">
                  {questionIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-relaxed font-medium text-ink">
                    {question.question}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                    {question.topic}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 pl-8">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[questionIndex] === optionIndex;
                  return (
                    <button
                      key={`${question.id}-${optionIndex}`}
                      type="button"
                      onClick={() => choose(questionIndex, optionIndex)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[13.5px] transition ${
                        selected
                          ? "border-amber-500 bg-amber-50 text-amber-900"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-amber-400/60 hover:bg-neutral-50"
                      }`}
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
                          selected
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-neutral-300 text-neutral-500"
                        }`}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="min-w-0 flex-1">{option}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}

          <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 bg-canvas/90 px-4 py-3 backdrop-blur">
            <p className="text-[12px] text-muted">
              {allAnswered
                ? t("quiz.allAnswered")
                : t("quiz.remaining", { count: quiz.questions.length - answered })}
            </p>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!allAnswered || submitting}
              className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {t("quiz.submit")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-surface p-6 text-center card-shadow">
          <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <Sparkles className="size-5" />
          </span>
          <h3 className="pt-3 text-base font-bold text-ink">{t("quiz.startTitle")}</h3>
          <p className="mx-auto max-w-md pt-1 text-[13px] leading-relaxed text-neutral-600">
            {t("quiz.startBody")}
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-amber-600 disabled:bg-neutral-300"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generating ? t("quiz.generating") : t("quiz.startButton")}
          </button>
          {generating ? (
            <p className="pt-3 text-[12px] text-muted">{t("quiz.generatingHint")}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ResultView({
  grade,
  onRetry,
  onGoProgress,
  generating,
  t,
}: {
  grade: QuizGrade;
  onRetry: () => void;
  onGoProgress: () => void;
  generating: boolean;
  t: TFunction;
}) {
  const percent = Math.round(grade.score * 100);
  const tone =
    percent >= 80 ? t("quiz.toneGreat") : percent >= 50 ? t("quiz.toneOk") : t("quiz.toneLow");

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl bg-surface p-5 card-shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-full bg-amber-100">
            <span className="text-xl font-bold text-amber-800">{percent}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-amber-700">{tone}</p>
            <h3 className="text-base font-bold text-ink">
              {t("quiz.scoreLine", {
                correct: grade.correct,
                total: grade.total,
                chapter: grade.chapter,
              })}
            </h3>
            <p className="pt-1 text-[12px] text-muted">
              {t("quiz.savedRows", { rows: grade.saved_rows })}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={onRetry}
              disabled={generating}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-neutral-200 disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {t("quiz.another")}
            </button>
            <button
              type="button"
              onClick={onGoProgress}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800"
            >
              {t("quiz.progress")}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {grade.results.map((item, index) => (
        <article key={item.id ?? index} className="rounded-2xl bg-surface p-4 card-shadow">
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
                item.correct ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}
            >
              {item.correct ? <CheckCircle2 className="size-4" /> : <CircleX className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-relaxed font-medium text-ink">
                {index + 1}. {item.question}
              </p>
              <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                {item.topic}
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 pl-8">
            {item.options.map((option, optionIndex) => {
              const isAnswer = optionIndex === item.answer;
              const isChosen = optionIndex === item.chosen;
              return (
                <div
                  key={`${index}-${optionIndex}`}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[13px] ${
                    isAnswer
                      ? "border-emerald-300 bg-emerald-50/70 text-emerald-900"
                      : isChosen
                        ? "border-rose-300 bg-rose-50/70 text-rose-900"
                        : "border-neutral-200 bg-white text-neutral-600"
                  }`}
                >
                  <span className="shrink-0 font-semibold">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="min-w-0 flex-1">{option}</span>
                  {isAnswer ? (
                    <span className="shrink-0 text-[11px] font-semibold text-emerald-700">
                      {t("quiz.correctTag")}
                    </span>
                  ) : isChosen ? (
                    <span className="shrink-0 text-[11px] font-semibold text-rose-700">
                      {t("quiz.yourAnswer")}
                    </span>
                  ) : null}
                </div>
              );
            })}
            {item.chosen === null ? (
              <p className="text-[11px] text-muted">{t("quiz.notAnswered")}</p>
            ) : null}
          </div>

          {item.explanation ? (
            <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-[12.5px] leading-relaxed text-neutral-700">
              <span className="font-semibold text-ink">{t("quiz.explanation")}</span>
              {item.explanation}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
        <BookOpen className="size-5" />
      </span>
      <h2 className="pt-4 text-base font-bold text-ink">{title}</h2>
      <p className="max-w-sm pt-1 text-[13px] leading-relaxed text-neutral-600">{body}</p>
      <button
        type="button"
        onClick={action.onClick}
        className="mt-5 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-neutral-800"
      >
        {action.label}
      </button>
    </div>
  );
}
