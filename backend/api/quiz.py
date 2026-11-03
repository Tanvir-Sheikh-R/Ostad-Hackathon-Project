"""Quiz tab endpoints: generate a chapter quiz, then grade and store the attempt."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import (
    language_of,
    language_of_stored,
    request_language,
    trusted_context,
    verify_context,
)
from backend.db import quiz_results as results_db
from backend.rag import quiz as quiz_engine
from backend.rag import retriever
from backend.rag.i18n import Language, msg
from backend.rag.llm import LLMError
from backend.schemas import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizGenerateResponse)
def generate(payload: QuizGenerateRequest) -> QuizGenerateResponse:
    """Generate MCQs from the selected chapter and remember the answer key."""
    language = language_of(payload.context)
    book = verify_context(payload.context)
    context = trusted_context(payload.context.model_dump(), book)

    try:
        questions = quiz_engine.generate(
            context["book"],
            context["chapter"],
            count=payload.count,
            subject_label=context["subject_label"],
            language=language,
        )
    except retriever.ChapterNotIndexed as exc:
        raise HTTPException(
            status_code=409, detail=msg(language, "no_cached_content", error=exc)
        ) from exc
    except LLMError as exc:
        logger.warning("Quiz generation failed: %s", exc)
        raise HTTPException(status_code=503, detail=msg(language, "quiz_llm_down")) from exc

    quiz_id = uuid.uuid4().hex[:12]
    results_db.save_session(
        quiz_id=quiz_id,
        student=payload.student,
        context=context,
        questions=questions,
    )

    return QuizGenerateResponse(
        quiz_id=quiz_id,
        student=payload.student,
        context=context,
        chapter=context["chapter"],
        subject_label=context["subject_label"],
        questions=questions,
        generated_at=results_db.now_iso(),
    )


@router.post("/submit", response_model=QuizSubmitResponse)
def submit(
    payload: QuizSubmitRequest,
    request_language_value: Language = Depends(request_language),
) -> QuizSubmitResponse:
    """Grade against the stored answer key, then persist one row per question."""
    stored = results_db.get_session(payload.quiz_id)
    if stored is None:
        raise HTTPException(
            status_code=404, detail=msg(request_language_value, "quiz_not_found")
        )

    # The session's own language wins: the questions were written in it.
    language = language_of_stored(stored)
    graded = quiz_engine.grade(stored["questions"], payload.answers)
    saved = results_db.save_attempt(
        quiz_id=payload.quiz_id,
        student=payload.student,
        context=stored,
        results=graded["results"],
    )
    # A quiz is graded once; removing the session makes a replayed submit impossible.
    results_db.delete_session(payload.quiz_id)

    return QuizSubmitResponse(
        quiz_id=payload.quiz_id,
        student=payload.student,
        context={
            "class_id": stored["class_id"],
            "class_label": stored.get("class_label", ""),
            "subject": stored["subject"],
            "subject_label": stored.get("subject_label", ""),
            "chapter": stored["chapter"],
            "language": language,
        },
        chapter=stored["chapter"],
        subject_label=stored.get("subject_label", ""),
        correct=graded["correct"],
        total=graded["total"],
        score=graded["score"],
        results=graded["results"],
        saved_rows=saved,
    )
