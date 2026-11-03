"""Shared dependencies and request guards for the API routers."""

from __future__ import annotations

from typing import Any

from fastapi import Header, HTTPException

from backend.rag import chapters, retriever
from backend.rag.i18n import Language, msg, normalize_language
from backend.schemas import ChapterContext

ANONYMOUS_CLIENT = "anonymous"


def client_id_of(x_client_id: str | None = Header(default=None, alias="X-Client-Id")) -> str:
    """Per-browser identity from the web client, so browsers never see each other's threads."""
    return (x_client_id or ANONYMOUS_CLIENT)[:64]


def request_language(x_client_lang: str | None = Header(default=None, alias="X-Client-Lang")) -> Language:
    """UI language for endpoints that have no chapter context (errors, progress).

    The client sends `X-Client-Lang: en|bn` on every request; anything unrecognised
    falls back to English.
    """
    return normalize_language(x_client_lang)


def language_of(context: ChapterContext) -> Language:
    return normalize_language(context.language)


def language_of_stored(context: dict[str, Any]) -> Language:
    """Language of a stored thread/quiz context dict; missing means English."""
    return normalize_language(context.get("language") if isinstance(context, dict) else None)


def verify_context(context: ChapterContext) -> dict[str, Any]:
    """Confirm the requested book/chapter exists in chapters.json and has vectors.

    The client sends labels back to the server on every request; only the book path
    and chapter name are trusted as keys, and both are re-derived here so a stale or
    hand-edited payload cannot point retrieval at the wrong index. Errors are raised in
    the request's own language.
    """
    language = language_of(context)

    book = chapters.lookup_book(context.book)
    if book is None:
        raise HTTPException(status_code=404, detail=msg(language, "book_missing"))

    names = {str(entry.get("name")) for entry in book["chapters"]}
    if context.chapter not in names:
        raise HTTPException(
            status_code=404,
            detail=msg(language, "chapter_missing", chapter=context.chapter),
        )

    if not retriever.is_indexed(context.book, context.chapter):
        raise HTTPException(
            status_code=409,
            detail=msg(language, "chapter_not_indexed", chapter=context.chapter),
        )
    return book


def trusted_context(payload: dict[str, Any], book: dict[str, Any]) -> dict[str, Any]:
    """Build the context dict stored on a thread/result from verified server-side data.

    Labels are picked in the request language, so a thread created in English keeps an
    English title in the sidebar.
    """
    language = normalize_language(payload.get("language"))
    english = language == "en"
    return {
        "class_id": book["class_id"],
        "class_label": book["class_label_en"] if english else book["class_label"],
        "subject": book["subject"],
        "subject_label": book["subject_label_en"] if english else book["subject_label"],
        "stream": book["stream"],
        "book": book["book"],
        "chapter": payload["chapter"],
        "language": language,
    }


def context_title(context: dict[str, Any]) -> str:
    """Thread title in the same shape the client displays: chapter · subject · class."""
    return " · ".join(
        str(context[key])
        for key in ("chapter", "subject_label", "class_label")
        if context.get(key)
    )
