"""Shared dependencies and request guards for the API routers."""

from __future__ import annotations

from typing import Any

from fastapi import Header, HTTPException

from backend.rag import chapters, retriever
from backend.schemas import ChapterContext

ANONYMOUS_CLIENT = "anonymous"


def client_id_of(x_client_id: str | None = Header(default=None, alias="X-Client-Id")) -> str:
    """Per-browser identity from the web client, so browsers never see each other's threads."""
    return (x_client_id or ANONYMOUS_CLIENT)[:64]


def verify_context(context: ChapterContext) -> dict[str, Any]:
    """Confirm the requested book/chapter exists in chapters.json and has vectors.

    The client sends labels back to the server on every request; only the book path
    and chapter name are trusted as keys, and both are re-derived here so a stale or
    hand-edited payload cannot point retrieval at the wrong index.
    """
    book = chapters.lookup_book(context.book)
    if book is None:
        raise HTTPException(status_code=404, detail="বইটি পাওয়া যায়নি।")

    names = {str(entry.get("name")) for entry in book["chapters"]}
    if context.chapter not in names:
        raise HTTPException(
            status_code=404,
            detail=f"“{context.chapter}” অধ্যায়টি এই বইয়ে নেই।",
        )

    if not retriever.is_indexed(context.book, context.chapter):
        raise HTTPException(
            status_code=409,
            detail=(
                f"“{context.chapter}” অধ্যায়ের জন্য এখনো কোনো সূচি (embedding) তৈরি হয়নি। "
                "অন্য অধ্যায় বেছে নিন।"
            ),
        )
    return book


def trusted_context(payload: dict[str, Any], book: dict[str, Any]) -> dict[str, Any]:
    """Build the context dict stored on a thread/result from verified server-side data."""
    chapter = payload["chapter"]
    return {
        "class_id": book["class_id"],
        "class_label": book["class_label"],
        "subject": book["subject"],
        "subject_label": book["subject_label"],
        "stream": book["stream"],
        "book": book["book"],
        "chapter": chapter,
    }
