"""Liveness/readiness reporting and an explicit model warm-up hook."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from backend.api.catalog import catalog_payload
from backend.config import (
    CATALOG_CLASSES,
    EMBEDDING_DIMENSION,
    EMBEDDING_MODEL_ID,
    QUIZ_QUESTION_COUNT,
    THREAD_RETENTION_DAYS,
)
from backend.rag import embeddings
from backend.rag.llm import available_providers
from backend.schemas import HealthOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["system"])


def _health(detail: str = "") -> HealthOut:
    counts = catalog_payload()[0].get("counts", {})
    providers = [provider.name for provider in available_providers()]

    # Report without forcing a model load: /health is polled by the container
    # healthcheck and must stay cheap even while the encoder is still loading.
    if embeddings.is_loaded():
        try:
            info = embeddings.model_info()
        except Exception as exc:  # noqa: BLE001 - degraded, not fatal
            logger.exception("Model info unavailable")
            info = {"model": EMBEDDING_MODEL_ID, "device": "unknown", "dimension": EMBEDDING_DIMENSION}
            detail = detail or str(exc)
    else:
        info = {"model": EMBEDDING_MODEL_ID, "device": "not-loaded", "dimension": EMBEDDING_DIMENSION}

    degraded = bool(detail) or not providers
    if not providers:
        detail = detail or "No LLM API key configured (set GROQ_API_KEY or DEEPSEEK_API_KEY)."

    return HealthOut(
        status="degraded" if degraded else "ok",
        embedding_model=str(info["model"]),
        device=str(info["device"]),
        dimension=int(info["dimension"]),
        llm_providers=providers,
        catalog_classes=list(CATALOG_CLASSES),
        indexed_books=int(counts.get("indexed_books", 0)),
        indexed_chapters=int(counts.get("indexed_chapters", 0)),
        quiz_question_count=QUIZ_QUESTION_COUNT,
        thread_retention_days=THREAD_RETENTION_DAYS,
        detail=detail,
    )


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return _health()


@router.post("/health/warmup", response_model=HealthOut)
def warmup() -> HealthOut:
    """Load the encoder and run one query so the first student question is not slow."""
    try:
        embeddings.warm_up()
    except Exception as exc:  # noqa: BLE001 - surfaced to the operator as 503
        logger.exception("Warm-up failed")
        raise HTTPException(status_code=503, detail=f"Embedding model load failed: {exc}") from exc
    return _health()
