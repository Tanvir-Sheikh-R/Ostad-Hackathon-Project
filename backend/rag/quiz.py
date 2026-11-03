"""MCQ generation and grading for one chapter.

The quiz is grounded in the chapter's own chunks: a handful of evenly spread chunks
are handed to the model as the exam's source material, and every question must be
answerable from them. Grading is a pure comparison against the stored answer index, so
it stays deterministic even when the LLM is unreachable.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from backend.config import QUIZ_CONTEXT_CHUNKS, QUIZ_OPTION_COUNT, QUIZ_QUESTION_COUNT
from backend.rag import retriever
from backend.rag.i18n import (
    QUIZ_GENERIC_TOPIC,
    QUIZ_HEADING,
    QUIZ_PAGE_NOTE,
    QUIZ_PART_LABEL,
    QUIZ_SUBJECT_NOTE,
    QUIZ_SYSTEM,
    QUIZ_TASK,
    Language,
    normalize_language,
)
from backend.rag.llm import invoke_json

logger = logging.getLogger(__name__)

_MAX_QUESTION_CHARS = 400
_MAX_OPTION_CHARS = 200
_MAX_TOPIC_CHARS = 80
_MAX_EXPLANATION_CHARS = 700

_LETTERS = {"a": 0, "b": 1, "c": 2, "d": 3, "ক": 0, "খ": 1, "গ": 2, "ঘ": 3}

_LANGUAGE_NAMES: dict[Language, str] = {"en": "English", "bn": "Bangla"}


class QuizGenerationError(RuntimeError):
    """The model did not return a usable quiz."""


def system_prompt(language: Language) -> str:
    return QUIZ_SYSTEM[language].format(
        options=QUIZ_OPTION_COUNT,
        language_name=_LANGUAGE_NAMES[language],
    )


def _clamp(text: Any, limit: int) -> str:
    return " ".join(str(text or "").split())[:limit]


def _strip_option_prefix(option: str) -> str:
    """Drop a leading "A) ", "ক) " or "1. " that models like to add to options."""
    raw = str(option).strip()
    if len(raw) > 2 and raw[0].lower() in _LETTERS and raw[1] in ").।:":
        return raw[2:].strip()
    if len(raw) > 3 and raw[:2].isdigit() and raw[2] in ").।:":
        return raw[3:].strip()
    return raw


def _resolve_answer(value: Any, options: list[str]) -> int:
    """Accept an index, a letter (A/ক) or the option text itself."""
    if isinstance(value, bool):
        raise ValueError("answer must be an index, not a boolean")
    if isinstance(value, int):
        if 0 <= value < len(options):
            return value
        if 1 <= value <= len(options):
            return value - 1
        raise ValueError(f"answer index {value} is outside 0..{len(options) - 1}")

    text = str(value).strip()
    if text.isdigit():
        return _resolve_answer(int(text), options)
    lowered = text.lower()
    if lowered in _LETTERS and _LETTERS[lowered] < len(options):
        return _LETTERS[lowered]
    normalized = _strip_option_prefix(text)
    for index, option in enumerate(options):
        if option == normalized or option.lower() == normalized.lower():
            return index
    raise ValueError(f"could not map answer {value!r} to any option")


def _normalize_question(raw: Any, language: Language = "en") -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("each question must be an object")

    question = _clamp(raw.get("question"), _MAX_QUESTION_CHARS)
    if len(question) < 8:
        raise ValueError("question text is missing or too short")

    options_raw = raw.get("options")
    if not isinstance(options_raw, list) or len(options_raw) != QUIZ_OPTION_COUNT:
        raise ValueError(f"options must be a list of exactly {QUIZ_OPTION_COUNT} strings")
    options = [_clamp(_strip_option_prefix(option), _MAX_OPTION_CHARS) for option in options_raw]
    if any(len(option) < 1 for option in options):
        raise ValueError("an option is empty")
    if len({option.casefold() for option in options}) != len(options):
        raise ValueError("options must be distinct")

    answer = _resolve_answer(raw.get("answer"), options)

    topic = _clamp(raw.get("topic"), _MAX_TOPIC_CHARS) or QUIZ_GENERIC_TOPIC[language]
    explanation = _clamp(raw.get("explanation"), _MAX_EXPLANATION_CHARS)

    return {
        "id": uuid.uuid4().hex[:8],
        "question": question,
        "options": options,
        "answer": answer,
        "topic": topic,
        "explanation": explanation,
    }


def _validate(payload: Any, count: int, language: Language = "en") -> list[dict[str, Any]]:
    items = payload.get("questions") if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        raise ValueError("expected a JSON object with a 'questions' array")
    if len(items) < count:
        raise ValueError(f"expected {count} questions, received {len(items)}")

    questions: list[dict[str, Any]] = []
    for index, item in enumerate(items[:count]):
        try:
            questions.append(_normalize_question(item, language))
        except ValueError as exc:
            raise ValueError(f"question {index + 1}: {exc}") from exc
    return questions


def build_source_material(chunks: list[dict[str, Any]], language: Language = "en") -> str:
    blocks: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        page = chunk.get("page_start") or chunk.get("page_end")
        page_note = QUIZ_PAGE_NOTE[language].format(page=page) if page else ""
        blocks.append(f"{QUIZ_PART_LABEL[language].format(index=index, page=page_note)}\n{chunk.get('text', '')}")
    return "\n\n".join(blocks)


def generate(
    book: str,
    chapter: str,
    *,
    count: int = QUIZ_QUESTION_COUNT,
    subject_label: str | None = None,
    language: Language | str | None = None,
) -> list[dict[str, Any]]:
    """Generate `count` chapter-grounded MCQs. Raises ChapterNotIndexed if empty."""
    lang = normalize_language(language if isinstance(language, str) else None)
    chunks = retriever.sample_chunks(book, chapter, QUIZ_CONTEXT_CHUNKS)
    if not chunks:
        raise retriever.ChapterNotIndexed(f"No chunks cached for {book} / {chapter}")

    heading = QUIZ_HEADING[lang].format(chapter=chapter)
    if subject_label:
        heading += QUIZ_SUBJECT_NOTE[lang].format(subject=subject_label)

    user = (
        f"{heading}\n\n"
        f"{QUIZ_TASK[lang].format(count=count)}\n\n"
        f"{build_source_material(chunks, lang)}"
    )

    questions = invoke_json(
        system_prompt(lang),
        user,
        temperature=0.5,
        max_tokens=3000,
        validate=lambda payload: _validate(payload, count, lang),
    )
    logger.info("Generated %d MCQs (%s) for %s / %s", len(questions), lang, book, chapter)
    return questions


def grade(questions: list[dict[str, Any]], answers: list[int | None]) -> dict[str, Any]:
    """Compare submitted indices with the stored answer key."""
    results: list[dict[str, Any]] = []
    correct = 0
    for index, question in enumerate(questions):
        chosen = answers[index] if index < len(answers) else None
        if isinstance(chosen, bool) or not isinstance(chosen, int):
            chosen = None
        elif not 0 <= chosen < len(question["options"]):
            chosen = None

        is_correct = chosen is not None and chosen == question["answer"]
        correct += int(is_correct)
        results.append(
            {
                "id": question.get("id"),
                "question": question["question"],
                "options": question["options"],
                "topic": question["topic"],
                "chosen": chosen,
                "answer": question["answer"],
                "correct": is_correct,
                "explanation": question.get("explanation", ""),
            }
        )

    total = len(questions)
    return {
        "correct": correct,
        "total": total,
        "score": round(correct / total, 4) if total else 0.0,
        "results": results,
    }
