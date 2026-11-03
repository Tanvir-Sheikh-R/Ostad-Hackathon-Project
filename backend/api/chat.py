"""Chat tabs: one thread per conversation, streamed answers grounded in one chapter."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Iterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from backend import store
from backend.api.deps import client_id_of, trusted_context, verify_context
from backend.rag import retriever
from backend.rag.answer import stream_answer
from backend.schemas import (
    ChatStart,
    ThreadContextUpdate,
    ThreadCreate,
    ThreadDetail,
    ThreadGroup,
    ThreadRename,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/threads", tags=["chat"])

# Questions that depend on the immediately preceding answer. Searching them as
# standalone textbook queries loses their referent ("এটা সহজ করে বলো") and returns
# unrelated chunks. New factual questions still retrieve.
_FOLLOW_UP_PATTERNS = (
    r"^(?:আরও\s+)?(?:সহজ|সংক্ষেপে|বিস্তারিত)\s+(?:করে\s+)?(?:বল|বলো|বুঝ(?:িয়ে|িয়ে)|বোঝ(?:াও|াও)|লেখ)",
    r"^(?:আরও\s+)?(?:একটি\s+)?(?:উদাহরণ|mcq|ফ্ল্যাশকার্ড|নোট)",
    r"^(?:এটা|এটি|ওটা|ওইটা|উপরের(?:টা|টি)|আগের(?:টা|টি|উত্তর)|তা|এর)",
    r"^(?:কেন|কীভাবে|কিভাবে|তারপর|মানে)",
    r"^(?:please\s+)?(?:explain|simplify|summari[sz]e|expand|translate|give\s+(?:an\s+)?example)\b",
    r"^(?:this|that|it|they|why|how|what\s+does\s+(?:this|that|it)\s+mean)\b",
)


def _is_follow_up(question: str, history: list[dict[str, Any]]) -> bool:
    """Whether a question explicitly refers to an earlier turn.

    Conservative by design: a student can ask a brand-new factual question inside the
    same thread and must still get fresh textbook retrieval.
    """
    if not history:
        return False
    normalized = " ".join(question.casefold().split())
    return any(re.match(pattern, normalized) for pattern in _FOLLOW_UP_PATTERNS)


def _to_detail(document: dict[str, Any]) -> ThreadDetail:
    return ThreadDetail(
        thread_id=document["thread_id"],
        title=document.get("title", "নতুন চ্যাট"),
        context=document.get("context") or {},
        messages=document.get("messages") or [],
        created_at=document.get("created_at", ""),
        updated_at=document.get("updated_at", ""),
    )


def _not_found(thread_id: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"চ্যাটটি পাওয়া যায়নি ({thread_id})।")


def _event(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


def _chat_stream(
    thread_id: str,
    context: dict[str, Any],
    question: str,
    history: list[dict[str, Any]],
) -> Iterator[str]:
    """Emit NDJSON events: status → delta* → done | error."""
    hits: list[dict[str, Any]] = []
    if not _is_follow_up(question, history):
        yield _event({"type": "status", "stage": "searching", "message": "পাঠ্যবই খোঁজা হচ্ছে..."})
        try:
            hits = retriever.search(context["book"], context["chapter"], question)
        except retriever.ChapterNotIndexed as exc:
            yield _event({"type": "error", "message": f"এই অধ্যায়ের সূচি পাওয়া যায়নি: {exc}"})
            return
        except Exception as exc:  # noqa: BLE001 - surfaced to the client as an error event
            logger.exception("Retrieval failed")
            yield _event({"type": "error", "message": f"খোঁজার সময় সমস্যা হয়েছে: {exc}"})
            return

        if not hits:
            message = "এই অধ্যায়ে প্রশ্নটির প্রাসঙ্গিক অংশ পাওয়া যায়নি। প্রশ্নটি অন্যভাবে করুন।"
            store.append_message(thread_id, {"role": "assistant", "content": message})
            yield _event({"type": "error", "message": message})
            return

    yield _event({"type": "status", "stage": "answering", "message": "উত্তর লেখা হচ্ছে..."})

    collected: list[str] = []
    try:
        for piece in stream_answer(question, hits, history=history):
            collected.append(piece)
            yield _event({"type": "delta", "text": piece})
    except Exception as exc:  # noqa: BLE001 - surfaced to the client as an error event
        logger.exception("Answer generation failed")
        if collected:
            partial = "".join(collected).strip()
            store.append_message(thread_id, {"role": "assistant", "content": partial})
        yield _event({"type": "error", "message": f"উত্তর তৈরি করতে সমস্যা হয়েছে: {exc}"})
        return

    answer = "".join(collected).strip()
    if not answer:
        yield _event({"type": "error", "message": "মডেল কোনো উত্তর দেয়নি। আবার চেষ্টা করুন।"})
        return

    document = store.append_message(thread_id, {"role": "assistant", "content": answer})
    yield _event(
        {
            "type": "done",
            "thread_id": thread_id,
            "title": document["title"],
            "updated_at": document["updated_at"],
        }
    )


@router.get("", response_model=list[ThreadGroup])
def list_threads(client_id: str = Depends(client_id_of)) -> list[ThreadGroup]:
    return [ThreadGroup(**group) for group in store.grouped(client_id)]


@router.post("", response_model=ThreadDetail)
def create_thread(payload: ThreadCreate, client_id: str = Depends(client_id_of)) -> ThreadDetail:
    book = verify_context(payload.context)
    context = trusted_context(payload.context.model_dump(), book)
    document = store.create(context, payload.context.title, client_id)
    return _to_detail(document)


@router.get("/{thread_id}", response_model=ThreadDetail)
def get_thread(thread_id: str, client_id: str = Depends(client_id_of)) -> ThreadDetail:
    try:
        return _to_detail(store.get(thread_id, client_id))
    except store.ThreadNotFound as exc:
        raise _not_found(thread_id) from exc


@router.put("/{thread_id}/context", response_model=ThreadDetail)
def update_thread_context(
    thread_id: str,
    payload: ThreadContextUpdate,
    client_id: str = Depends(client_id_of),
) -> ThreadDetail:
    book = verify_context(payload.context)
    context = trusted_context(payload.context.model_dump(), book)
    try:
        store.get(thread_id, client_id)
        return _to_detail(store.update_context(thread_id, context, payload.context.title))
    except store.ThreadNotFound as exc:
        raise _not_found(thread_id) from exc


@router.patch("/{thread_id}", response_model=ThreadDetail)
def rename_thread(
    thread_id: str,
    payload: ThreadRename,
    client_id: str = Depends(client_id_of),
) -> ThreadDetail:
    try:
        return _to_detail(store.rename(thread_id, payload.title, client_id))
    except store.ThreadNotFound as exc:
        raise _not_found(thread_id) from exc


@router.delete("/{thread_id}", status_code=204)
def delete_thread(thread_id: str, client_id: str = Depends(client_id_of)) -> None:
    try:
        store.get(thread_id, client_id)
        store.delete(thread_id)
    except store.ThreadNotFound as exc:
        raise _not_found(thread_id) from exc


@router.post("/{thread_id}/chat")
def chat(
    thread_id: str,
    payload: ChatStart,
    client_id: str = Depends(client_id_of),
) -> StreamingResponse:
    try:
        document = store.get(thread_id, client_id)
    except store.ThreadNotFound as exc:
        raise _not_found(thread_id) from exc

    book = verify_context(payload.context)
    context = trusted_context(payload.context.model_dump(), book)
    history = list(document.get("messages") or [])

    store.update_context(thread_id, context, payload.context.title)
    store.append_message(thread_id, {"role": "user", "content": payload.message})

    return StreamingResponse(
        _chat_stream(thread_id, context, payload.message, history),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
