"""Progress tab endpoints: statistics, subject filter, parent summary, resets."""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.api.deps import request_language
from backend.db import quiz_results as results_db
from backend.rag import chapters
from backend.rag.i18n import Language, msg
from backend.rag.summary import parent_summary
from backend.schemas import ProgressResponse, ResetResponse, SummaryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/progress", tags=["progress"])

_STUDENT_MAX = 64
_SUBJECT_MAX = 64

# Summaries cost an LLM call per request; identical statistics reuse the same text.
# The key includes the language and the subject filter, so toggling either produces a
# separate summary instead of serving prose written for a different view.
_summary_lock = threading.Lock()
_summary_cache: dict[str, dict[str, Any]] = {}
_SUMMARY_CACHE_MAX = 128


def _student_name(raw: str | None, language: Language) -> str:
    name = " ".join((raw or "").split())[:_STUDENT_MAX]
    if not name:
        raise HTTPException(status_code=400, detail=msg(language, "student_required"))
    return name


def _clean_subject(raw: str | None) -> str | None:
    subject = " ".join((raw or "").split())[:_SUBJECT_MAX]
    return subject or None


def _localize(rows: list[dict[str, Any]], language: Language) -> list[dict[str, Any]]:
    """Add the display titles for each row (English when available).

    Chapter titles come from chapter_titles_en.json, subject labels from the catalog.
    Both fall back to the value stored with the result, so a book that is no longer in
    chapters.json still renders.
    """
    for row in rows:
        book = f"{row.get('class_id') or ''}/{row['subject']}"
        chapter = row.get("chapter")
        if chapter:
            row["chapter_label"] = chapters.chapter_display(book, chapter, language)
        info = chapters.lookup_book(book)
        if info:
            label = info["subject_label_en"] if language == "en" else info["subject_label"]
            if label:
                row["subject_label"] = label
    return rows


def _digest(stats: dict[str, Any], language: Language, subject: str | None) -> str:
    """Stable key for the statistics (plus language and filter) a summary came from."""
    payload = {
        "language": language,
        "subject": subject,
        "overall": stats.get("overall"),
        "chapters": stats.get("chapters"),
        "weak_topics": stats.get("weak_topics"),
    }
    body = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(body.encode("utf-8")).hexdigest()[:24]


def _cached_summary(
    stats: dict[str, Any], language: Language, subject: str | None
) -> dict[str, Any]:
    key = _digest(stats, language, subject)
    with _summary_lock:
        hit = _summary_cache.get(key)
    if hit is not None:
        return hit

    result = parent_summary(stats, student=stats.get("student"), language=language)
    with _summary_lock:
        if len(_summary_cache) >= _SUMMARY_CACHE_MAX:
            _summary_cache.clear()
        _summary_cache[key] = result
    return result


def _invalidate_summaries() -> None:
    """Drop cached prose after results change, so a reset shows up immediately."""
    with _summary_lock:
        _summary_cache.clear()


def _report(student: str, language: Language, subject: str | None) -> dict[str, Any]:
    report = results_db.progress_report(student, subject=subject)
    for key in ("chapters", "weak_topics", "recent", "subjects"):
        report[key] = _localize(report[key], language)
    report["filter"] = {"subject": subject}
    return report


@router.get("", response_model=ProgressResponse)
def get_progress(
    student: str | None = Query(default=None, max_length=_STUDENT_MAX),
    subject: str | None = Query(default=None, max_length=_SUBJECT_MAX),
    language: Language = Depends(request_language),
) -> ProgressResponse:
    """Average score per chapter, weakest topics and recent attempts.

    `subject` narrows every aggregate to one subject; the `subjects` list always holds
    every subject the student has results for, which is what the filter renders.
    """
    name = _student_name(student, language)
    return ProgressResponse(**_report(name, language, _clean_subject(subject)))


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    student: str | None = Query(default=None, max_length=_STUDENT_MAX),
    subject: str | None = Query(default=None, max_length=_SUBJECT_MAX),
    language: Language = Depends(request_language),
) -> SummaryResponse:
    """A short report for a parent, written from the (optionally filtered) statistics."""
    name = _student_name(student, language)
    filter_subject = _clean_subject(subject)
    stats = results_db.progress_report(name, subject=filter_subject)
    result = _cached_summary(stats, language, filter_subject)
    return SummaryResponse(
        student=name,
        summary=str(result["summary"]),
        source=result["source"],  # type: ignore[arg-type]
        overall=stats["overall"],
        generated_at=results_db.now_iso(),
    )


@router.delete("/chapter", response_model=ResetResponse)
def reset_chapter(
    student: str = Query(..., max_length=_STUDENT_MAX),
    subject: str = Query(..., max_length=_SUBJECT_MAX),
    chapter: str = Query(..., min_length=1, max_length=200),
) -> ResetResponse:
    """Delete every stored answer for one chapter of one subject."""
    name = _student_name(student, None)
    deleted = results_db.delete_chapter_results(name, _clean_subject(subject) or "", chapter)
    _invalidate_summaries()
    logger.info("Deleted %s answers for %s / %s / %s", deleted, name, subject, chapter)
    return ResetResponse(student=name, scope="chapter", deleted=deleted)


@router.delete("/all", response_model=ResetResponse)
def reset_all(student: str = Query(..., max_length=_STUDENT_MAX)) -> ResetResponse:
    """Delete every stored answer for one student (all subjects, all chapters)."""
    name = _student_name(student, None)
    deleted = results_db.delete_all_results(name)
    _invalidate_summaries()
    logger.info("Deleted %s answers for %s (all)", deleted, name)
    return ResetResponse(student=name, scope="all", deleted=deleted)
