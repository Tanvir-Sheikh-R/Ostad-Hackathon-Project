"""Answer generation: retrieved chapter chunks + the student question → answer.

The system prompt and output language come from backend/rag/i18n.py, so the chat tab
answers in whatever language the student picked in the UI.
"""

from __future__ import annotations

from typing import Any, Iterable, Iterator, Mapping

from backend.rag.i18n import ANSWER_LANGUAGE_RULE, ANSWER_SYSTEM, Language, normalize_language
from backend.rag.llm import stream_text


def format_context(chunks: list[Mapping[str, Any]]) -> str:
    blocks: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        heading_bits = [chunk.get("part"), chunk.get("chapter")]
        heading = " → ".join(str(bit) for bit in heading_bits if bit) or "Textbook"
        pages = chunk.get("page_start")
        page_note = f" (page {pages})" if pages else ""
        blocks.append(f"[Passage {index} — {heading}{page_note}]\n{chunk.get('text', '')}")
    return "\n\n".join(blocks)


def format_history(messages: Iterable[Mapping[str, Any]], limit: int = 8) -> str:
    """Render the most recent prior turns; the current question is passed separately."""
    turns: list[str] = []
    window = list(messages)[-limit:]
    for message in window:
        role = "Student" if message.get("role") == "user" else "Assistant"
        content = str(message.get("content", "")).strip()
        if content:
            turns.append(f"{role}: {content}")
    return "\n\n".join(turns) or "(no previous conversation)"


def build_prompt(
    query: str,
    chunks: list[Mapping[str, Any]],
    history: Iterable[Mapping[str, Any]] = (),
) -> str:
    context = format_context(chunks) or "(no new textbook passage was retrieved)"
    return (
        f"Previous conversation:\n{format_history(history)}\n\n"
        f"Student's question: {query}\n\n"
        f"Relevant textbook passages:\n{context}"
    )


def system_prompt(language: Language | str | None = None) -> str:
    lang = normalize_language(language if isinstance(language, str) else None)
    return f"{ANSWER_SYSTEM[lang]}\n\n{ANSWER_LANGUAGE_RULE[lang]}"


def stream_answer(
    query: str,
    chunks: list[Mapping[str, Any]],
    *,
    history: Iterable[Mapping[str, Any]] = (),
    language: Language | str | None = None,
) -> Iterator[str]:
    yield from stream_text(system_prompt(language), build_prompt(query, chunks, history))


def answer(
    query: str,
    chunks: list[Mapping[str, Any]],
    *,
    history: Iterable[Mapping[str, Any]] = (),
    language: Language | str | None = None,
) -> str:
    return "".join(stream_answer(query, chunks, history=history, language=language)).strip()
