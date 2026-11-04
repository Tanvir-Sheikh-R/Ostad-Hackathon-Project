"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Loader2, TriangleAlert, X } from "lucide-react";
import type { Chapter, ChapterContext, ClassNode, Subject } from "@/lib/types";
import type { Language, TFunction } from "@/lib/i18n";

export type PickerResult = {
  context: ChapterContext;
  startFresh: boolean;
};

/** "new" starts a thread, "switch" re-targets the current thread, "select" only picks. */
export type PickerMode = "new" | "switch" | "select";

const CHAPTER_SEARCH_THRESHOLD = 40;

const SUBMIT_LABELS: Record<PickerMode, { key: "picker.start" | "picker.select"; busy: "picker.starting" | "picker.selecting" }> = {
  new: { key: "picker.start", busy: "picker.starting" },
  switch: { key: "picker.start", busy: "picker.starting" },
  select: { key: "picker.select", busy: "picker.selecting" },
};

const TITLE_KEYS = {
  new: "picker.title.new",
  switch: "picker.title.switch",
  select: "picker.title.select",
} as const;

export function SelectionModal({
  classes,
  initialContext,
  mode,
  language,
  onCancel,
  onSubmit,
  t,
}: {
  classes: ClassNode[];
  initialContext: ChapterContext | null;
  mode: PickerMode;
  language: Language;
  onCancel: (() => void) | null;
  onSubmit: (result: PickerResult) => Promise<void>;
  t: TFunction;
}) {
  // The app is scoped to a single class (Class 9-10 / SSC), so it is shown as text
  // instead of a dropdown that would only ever have one option.
  const classNode: ClassNode | null = classes[0] ?? null;
  // Fall back to the Bangla label if the backend predates the English labels.
  const classLabel = classNode
    ? language === "en"
      ? (classNode.label_en ?? classNode.label)
      : classNode.label
    : "";
  const subjects = classNode?.subjects ?? [];

  const [subjectKey, setSubjectKey] = useState<string>(
    initialContext ? `${initialContext.stream ?? ""}::${initialContext.subject}` : "",
  );
  const [chapterName, setChapterName] = useState<string>(initialContext?.chapter ?? "");
  const [chapterQuery, setChapterQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subject: Subject | null =
    subjects.find((item) => `${item.stream ?? ""}::${item.subject}` === subjectKey) ?? null;
  const chapters = subject?.chapters ?? [];

  /** Display title: the English title when the translation exists, else the stored one. */
  function titleOf(chapter: Chapter): string {
    return language === "en" ? (chapter.name_en ?? chapter.name) : chapter.name;
  }

  const query = chapterQuery.trim().toLowerCase();
  const visibleChapters = query
    ? chapters.filter(
        (chapter) =>
          chapter.name.toLowerCase().includes(query) ||
          (chapter.name_en ?? "").toLowerCase().includes(query),
      )
    : chapters;

  // Clear the chapter when a different subject is picked (not on first render).
  const previousSubjectKey = useRef(subjectKey);
  useEffect(() => {
    if (previousSubjectKey.current === subjectKey) {
      return;
    }
    previousSubjectKey.current = subjectKey;
    setChapterName("");
    setChapterQuery("");
  }, [subjectKey]);

  const selectedChapter = chapters.find((chapter) => chapter.name === chapterName) ?? null;
  const chapterReady = Boolean(selectedChapter && selectedChapter.indexed !== false);
  const ready = Boolean(classNode && subject && chapterName && chapterReady);
  const copy = SUBMIT_LABELS[mode];

  async function handleSubmit() {
    if (!classNode || !subject || !chapterName || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        startFresh: mode === "new",
        context: {
          class_id: classNode.class_id,
          class_label: classLabel,
          subject: subject.subject,
          subject_label:
            language === "en" ? (subject.label_en ?? subject.label) : subject.label,
          stream: subject.stream,
          book: subject.book,
          chapter: chapterName,
          // Display title only; `chapter` stays the key the vector store is indexed by.
          chapter_label: selectedChapter ? titleOf(selectedChapter) : chapterName,
          language,
        },
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("picker.failed"));
      setSubmitting(false);
    }
  }

  return (
    <div className="bb-fade-in fixed inset-0 z-40 grid place-items-center bg-neutral-900/25 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(TITLE_KEYS[mode])}
        className="bb-slide-up max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface p-6 card-shadow"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{t(TITLE_KEYS[mode])}</h2>
            <p className="pt-1 text-xs leading-relaxed text-muted">{t("picker.subtitle")}</p>
          </div>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              aria-label={t("picker.close")}
              className="rounded-full p-1.5 text-muted transition hover:bg-neutral-100 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Soft, flat base box around the selection form (no gradient). */}
        <div className="mt-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between pb-1.5">
                <span className="text-xs font-medium text-neutral-700">{t("picker.class")}</span>
                <span className="text-[11px] text-muted">{t("picker.fixedClass")}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 px-4 py-2.5">
                <GraduationCap className="size-4 shrink-0 text-accent" />
                <span className="text-sm font-semibold text-ink">{classLabel}</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between pb-1.5">
                <span className="text-xs font-medium text-neutral-700">{t("picker.subject")}</span>
              </div>
              <select
                value={subjectKey}
                onChange={(event) => setSubjectKey(event.target.value)}
                disabled={!classNode}
                className="w-full appearance-none rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-neutral-50 disabled:text-muted"
              >
                <option value="">{t("picker.subjectPlaceholder")}</option>
                {subjects.map((item) => {
                  const key = `${item.stream ?? ""}::${item.subject}`;
                  const label =
                    language === "en" ? (item.label_en ?? item.label) : item.label;
                  return (
                    <option key={key} value={key}>
                      {label}
                      {item.indexed ? "" : ` ${t("picker.noIndex")}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <div className="flex items-baseline justify-between pb-1.5">
                <span className="text-xs font-medium text-neutral-700">{t("picker.chapter")}</span>
                {chapters.length > 0 ? (
                  <span className="text-[12px] text-muted">
                    {t("picker.chapterCount", { count: chapters.length })}
                  </span>
                ) : null}
              </div>
              {chapters.length > CHAPTER_SEARCH_THRESHOLD ? (
                <input
                  value={chapterQuery}
                  onChange={(event) => setChapterQuery(event.target.value)}
                  placeholder={t("picker.searchChapter")}
                  className="mb-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-xs text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              ) : null}
              <select
                value={chapterName}
                onChange={(event) => setChapterName(event.target.value)}
                disabled={chapters.length === 0}
                className="w-full appearance-none rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-neutral-50 disabled:text-muted"
              >
                <option value="">
                  {chapters.length === 0
                    ? t("picker.chapterNeedsSubject")
                    : t("picker.chapterPlaceholder")}
                </option>
                {visibleChapters.map((chapter) => (
                  <option key={`${chapter.number}-${chapter.name}`} value={chapter.name}>
                    {language === "bn" && chapter.parent ? `${chapter.parent} — ` : ""}
                    {titleOf(chapter)}
                    {chapter.writer_name ? ` · ${chapter.writer_name}` : ""}
                    {chapter.starting_page
                      ? ` — ${t("picker.page", { page: chapter.starting_page })}`
                      : ""}
                    {chapter.indexed === false ? ` ${t("picker.noIndex")}` : ""}
                  </option>
                ))}
              </select>
              {chapterName && !chapterReady ? (
                <p className="pt-1.5 text-[12px] leading-relaxed text-amber-700">
                  {t("picker.notIndexed")}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-800 ring-1 ring-rose-200">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!ready || submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t(copy.busy)}
            </>
          ) : (
            t(copy.key)
          )}
        </button>
      </div>
    </div>
  );
}
