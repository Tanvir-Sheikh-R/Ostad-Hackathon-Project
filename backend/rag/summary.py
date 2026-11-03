"""The short parent-facing progress summary.

The numbers come from SQLite; the model only turns them into prose. A deterministic
fallback is returned when the LLM is unavailable, so the progress tab never breaks
just because a provider is down. Both text paths follow the UI language.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.config import SUMMARY_MAX_TOKENS
from backend.rag.i18n import (
    SUMMARY_ASK,
    SUMMARY_FALLBACK,
    SUMMARY_LABELS,
    SUMMARY_SYSTEM,
    Language,
    normalize_language,
)
from backend.rag.llm import invoke_text

logger = logging.getLogger(__name__)


def _digest(stats: dict[str, Any], language: Language) -> str:
    """Render the computed statistics as compact text for the prompt."""
    labels = SUMMARY_LABELS[language]
    overall = stats.get("overall") or {}
    chapters = stats.get("chapters") or []
    topics = stats.get("weak_topics") or []

    lines = [
        labels["student"].format(student=stats.get("student") or "Student"),
        labels["totals"].format(
            quiz_count=overall.get("quiz_count", 0),
            questions=overall.get("questions", 0),
            correct=overall.get("correct", 0),
            accuracy=overall.get("accuracy", 0),
        ),
    ]

    if not chapters:
        lines.append(labels["no_chapters"])
    else:
        lines.append(labels["per_chapter"])
        for chapter in chapters:
            lines.append(
                labels["chapter_line"].format(
                    chapter=chapter["chapter"],
                    subject=chapter.get("subject_label") or chapter["subject"],
                    accuracy=chapter["accuracy"],
                    quiz_count=chapter["quiz_count"],
                    questions=chapter["questions"],
                )
            )

    if topics:
        lines.append(labels["weak"])
        for topic in topics:
            lines.append(
                labels["weak_line"].format(
                    topic=topic["topic"],
                    chapter=topic["chapter"],
                    correct=topic["correct"],
                    questions=topic["questions"],
                )
            )
    else:
        lines.append(labels["no_weak"])
    return "\n".join(lines)


def fallback_summary(stats: dict[str, Any], language: Language = "en") -> str:
    """Used when no LLM provider answers; built only from the same numbers."""
    text = SUMMARY_FALLBACK[language]
    student = stats.get("student") or ("শিক্ষার্থী" if language == "bn" else "Student")
    overall = stats.get("overall") or {}

    if not overall.get("questions"):
        return text["empty"].format(student=student)

    best = (stats.get("chapters") or [{}])[0]
    weak = (stats.get("weak_topics") or [{}])[0]

    parts = [
        text["lead"].format(
            student=student,
            quiz_count=overall.get("quiz_count", 0),
            questions=overall.get("questions", 0),
            accuracy=overall.get("accuracy", 0),
        )
    ]
    if best.get("chapter"):
        parts.append(text["best"].format(chapter=best["chapter"], accuracy=best["accuracy"]))
    if weak.get("topic"):
        parts.append(
            text["weak"].format(
                topic=weak["topic"],
                correct=weak["correct"],
                questions=weak["questions"],
            )
        )
    else:
        parts.append(text["no_weak"])
    return "".join(parts)


def parent_summary(
    stats: dict[str, Any],
    *,
    student: str | None = None,
    language: Language | str | None = None,
) -> dict[str, Any]:
    """Return {summary, source} — source is 'llm' or 'fallback'."""
    lang = normalize_language(language if isinstance(language, str) else None)
    payload = dict(stats)
    payload.setdefault("student", student or ("শিক্ষার্থী" if lang == "bn" else "Student"))

    user = SUMMARY_ASK[lang].format(digest=_digest(payload, lang))

    try:
        summary = invoke_text(SUMMARY_SYSTEM[lang], user, temperature=0.3, max_tokens=SUMMARY_MAX_TOKENS)
        if summary:
            return {"summary": summary, "source": "llm"}
        logger.warning("LLM returned an empty summary; using fallback")
    except Exception as exc:  # noqa: BLE001 - the report must render regardless
        logger.warning("Parent summary LLM failed (%s); using fallback", exc)

    return {"summary": fallback_summary(payload, lang), "source": "fallback"}
