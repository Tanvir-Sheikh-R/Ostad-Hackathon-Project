"""LLM access with a provider fallback chain (Groq first, DeepSeek second).

Everything that needs a model — chat answers, MCQ generation, the parent summary —
goes through this module, so the fallback behaviour and the JSON-repair logic exist in
exactly one place.
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Iterator

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from backend.config import (
    DEEPSEEK_MODEL,
    GROQ_MODEL,
    LLM_MAX_TOKENS,
    LLM_PROVIDER_ORDER,
    LLM_TEMPERATURE,
)

logger = logging.getLogger(__name__)

_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


class LLMError(RuntimeError):
    """No provider produced a usable answer."""


@dataclass(frozen=True)
class Provider:
    name: str
    model: str
    api_key: str


def available_providers() -> list[Provider]:
    """Providers named in LLM_PROVIDER_ORDER that actually have an API key."""
    found: list[Provider] = []
    for name in LLM_PROVIDER_ORDER:
        if name == "groq":
            key = os.getenv("GROQ_API_KEY", "").strip()
            if key:
                found.append(Provider("groq", GROQ_MODEL, key))
        elif name == "deepseek":
            key = os.getenv("DEEPSEEK_API_KEY", "").strip()
            if key:
                found.append(Provider("deepseek", DEEPSEEK_MODEL, key))
        else:
            logger.warning("Ignoring unknown LLM provider %r", name)
    return found


def _build(provider: Provider, temperature: float, max_tokens: int):
    """Instantiate a chat model for one provider."""
    if provider.name == "groq":
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=provider.model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=provider.api_key,
        )
    from langchain_deepseek import ChatDeepSeek

    return ChatDeepSeek(
        model=provider.model,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=provider.api_key,
    )


def _messages(system: str, user: str) -> list[BaseMessage]:
    return [SystemMessage(content=system), HumanMessage(content=user)]


def _text_of(chunk: Any) -> str:
    """Normalise a LangChain message chunk to plain text."""
    content = getattr(chunk, "content", chunk)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        # Some providers return content blocks: [{"type": "text", "text": "..."}]
        return "".join(
            block.get("text", "") if isinstance(block, dict) else str(block) for block in content
        )
    return str(content or "")


def stream_text(
    system: str,
    user: str,
    *,
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
) -> Iterator[str]:
    """Stream an answer, falling back to the next provider if the first call fails.

    Fallback happens only before the first token reaches the caller: once text has
    been streamed onward, retrying a different provider would duplicate it.
    """
    providers = available_providers()
    if not providers:
        raise LLMError(
            "No LLM API key is configured. Set GROQ_API_KEY (or DEEPSEEK_API_KEY) in .env."
        )

    errors: list[str] = []
    for provider in providers:
        model = _build(provider, temperature, max_tokens)
        emitted = False
        try:
            for chunk in model.stream(_messages(system, user)):
                piece = _text_of(chunk)
                if piece:
                    emitted = True
                    yield piece
            return
        except Exception as exc:  # noqa: BLE001 - provider errors are heterogeneous
            if emitted:
                logger.exception("%s failed mid-stream after emitting text", provider.name)
                raise LLMError(f"{provider.name} stream interrupted: {exc}") from exc
            logger.warning("%s failed (%s); trying next provider", provider.name, exc)
            errors.append(f"{provider.name}: {exc}")

    raise LLMError("Every LLM provider failed. " + " | ".join(errors))


def invoke_text(
    system: str,
    user: str,
    *,
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
) -> str:
    return "".join(stream_text(system, user, temperature=temperature, max_tokens=max_tokens)).strip()


def extract_json(text: str) -> Any:
    """Pull the first JSON object/array out of a model reply (handles ``` fences)."""
    cleaned = _FENCE.sub("", (text or "").strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    for opener, closer in (("{", "}"), ("[", "]")):
        start = cleaned.find(opener)
        end = cleaned.rfind(closer)
        if start != -1 and end > start:
            candidate = cleaned[start : end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue
    raise json.JSONDecodeError("No JSON object found in model output", cleaned[:200], 0)


def invoke_json(
    system: str,
    user: str,
    *,
    temperature: float = 0.3,
    max_tokens: int = LLM_MAX_TOKENS,
    validate=None,
) -> Any:
    """Ask for JSON, parse it, and let the caller supply a validating transformer.

    A parse or validation failure is retried once with the same provider and the error
    appended to the prompt, then the next provider is tried. This is what keeps a
    malformed MCQ batch from surfacing as a 500 in the quiz tab.
    """
    providers = available_providers()
    if not providers:
        raise LLMError(
            "No LLM API key is configured. Set GROQ_API_KEY (or DEEPSEEK_API_KEY) in .env."
        )

    errors: list[str] = []
    for provider in providers:
        model = _build(provider, temperature, max_tokens)
        attempt_user = user
        for attempt in range(2):
            try:
                reply = _text_of(model.invoke(_messages(system, attempt_user)))
                data = extract_json(reply)
                return validate(data) if validate else data
            except Exception as exc:  # noqa: BLE001 - parse and validation errors alike
                errors.append(f"{provider.name}#{attempt + 1}: {exc}")
                logger.warning("%s JSON attempt %d failed: %s", provider.name, attempt + 1, exc)
                attempt_user = (
                    f"{user}\n\nYour previous reply was rejected by the JSON validator with:\n"
                    f"{exc}\n\nReply again with corrected JSON only."
                )

    raise LLMError("Could not obtain valid JSON from any LLM provider. " + " | ".join(errors))
