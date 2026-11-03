"""Progress tab endpoints: computed statistics plus the LLM parent summary."""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend.db import quiz_results as results_db
from backend.rag.summary import parent_summary
from backend.schemas import ProgressResponse, SummaryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/progress", tags=["progress"])

_STUDENT_MAX = 64

# Summaries cost an LLM call per request; identical statistics reuse the same text.
_summary_lock = threading.Lock()
_summary_cache: dict[str, dict[str, Any]] = {}
_SUMMARY_CACHE_MAX = 128


def _student_name(raw: str | None) -> str:
    name = " ".join((raw or "").split())[:_STUDENT_MAX]
    if not name:
        raise HTTPException(status_code=400, detail="শিক্ষার্থীর নাম দরকার।")
    return name


def _digest(stats: dict[str, Any]) -> str:
    """Stable key for the statistics a summary was written from."""
    payload = {
        "overall": stats.get("overall"),
        "chapters": stats.get("chapters"),
        "weak_topics": stats.get("weak_topics"),
    }
    body = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(body.encode("utf-8")).hexdigest()[:24]


def _cached_summary(stats: dict[str, Any]) -> dict[str, Any]:
    key = _digest(stats)
    with _summary_lock:
        hit = _summary_cache.get(key)
    if hit is not None:
        return hit

    result = parent_summary(stats, student=stats.get("student"))
    with _summary_lock:
        if len(_summary_cache) >= _SUMMARY_CACHE_MAX:
            _summary_cache.clear()
        _summary_cache[key] = result
    return result


@router.get("", response_model=ProgressResponse)
def get_progress(
    student: str | None = Query(default=None, max_length=_STUDENT_MAX),
) -> ProgressResponse:
    """Average score per chapter, weakest topics, and the recent attempts."""
    return ProgressResponse(**results_db.progress_report(_student_name(student)))


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    student: str | None = Query(default=None, max_length=_STUDENT_MAX),
) -> SummaryResponse:
    """A short Bangla report for a parent, written from the stored statistics."""
    name = _student_name(student)
    stats = results_db.progress_report(name)
    result = _cached_summary(stats)
    return SummaryResponse(
        student=name,
        summary=str(result["summary"]),
        source=result["source"],  # type: ignore[arg-type]
        overall=stats["overall"],
        generated_at=results_db.now_iso(),
    )
