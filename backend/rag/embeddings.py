"""multilingual-e5-base query encoder, loaded from a flat local model directory.

The dense indexes on disk were embedded with this exact model (768-d), so the query
side must use it too: FAISS raises a dimension mismatch for anything else, and vectors
from a different model would not be comparable even if the shapes matched.

Loading is by filesystem path, not by HuggingFace model id. That skips the hub cache
scan (blobs/, refs/, snapshot resolution) which dominated cold start when the cache
still held several redundant copies of the weights.
"""

from __future__ import annotations

import logging
import threading

from backend.config import (
    E5_PASSAGE_PREFIX,
    E5_QUERY_PREFIX,
    EMBEDDING_DEVICE,
    EMBEDDING_DIMENSION,
    EMBEDDING_MODEL_DIR,
    EMBEDDING_MODEL_ID,
    EMBEDDING_THREADS,
)

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_model = None


class ModelUnavailable(RuntimeError):
    """The sentence-transformers model could not be loaded from disk."""


def _resolve_device() -> str:
    if EMBEDDING_DEVICE:
        return EMBEDDING_DEVICE
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:  # pragma: no cover - torch is a hard dependency in practice
        return "cpu"


def get_model():
    """Load the encoder once and keep it resident for the process lifetime."""
    global _model
    if _model is not None:
        return _model

    with _lock:
        if _model is not None:
            return _model

        if not (EMBEDDING_MODEL_DIR / "config.json").exists():
            raise ModelUnavailable(
                f"No embedding model at {EMBEDDING_MODEL_DIR}. "
                "Expected a flat sentence-transformers directory "
                "(config.json, model.safetensors, tokenizer files)."
            )

        try:
            import torch
        except Exception as exc:  # pragma: no cover
            raise ModelUnavailable(f"torch is not importable: {exc}") from exc

        if EMBEDDING_THREADS > 0:
            torch.set_num_threads(EMBEDDING_THREADS)

        try:
            from sentence_transformers import SentenceTransformer

            model = SentenceTransformer(str(EMBEDDING_MODEL_DIR), device=_resolve_device())
        except Exception as exc:
            raise ModelUnavailable(f"Could not load {EMBEDDING_MODEL_DIR}: {exc}") from exc

        dimension = _dimension_of(model)
        if dimension != EMBEDDING_DIMENSION:
            raise ModelUnavailable(
                f"{EMBEDDING_MODEL_ID} produced {dimension}-d vectors but the cached "
                f"indexes are {EMBEDDING_DIMENSION}-d. Query and document vectors must "
                "come from the same model: re-embed the corpus with "
                "pipeline/pdf_to_document_cleanV2.ipynb before switching encoders."
            )

        _model = model
        logger.info("Loaded %s (%d-d) on %s", EMBEDDING_MODEL_ID, dimension, _resolve_device())
        return _model


def _dimension_of(model) -> int:
    method = getattr(model, "get_embedding_dimension", None) or getattr(
        model, "get_sentence_embedding_dimension", None
    )
    try:
        return int(method()) if method else EMBEDDING_DIMENSION
    except Exception:  # pragma: no cover
        return EMBEDDING_DIMENSION


def is_loaded() -> bool:
    """Whether the encoder is already resident (used by /health, which never loads it)."""
    return _model is not None


def model_info() -> dict[str, object]:
    model = get_model()
    return {
        "model": EMBEDDING_MODEL_ID,
        "device": str(getattr(model, "device", "cpu")),
        "dimension": _dimension_of(model),
    }


def warm_up() -> dict[str, object]:
    """Load the model and encode one throwaway string, so the first real query is fast."""
    info = model_info()
    encode_query("উত্তরপত্র প্রস্তুত")
    return info


def encode_query(text: str):
    """Encode a search query (E5 wants the "query: " prefix on this side only)."""
    model = get_model()
    with _lock:
        return model.encode(
            E5_QUERY_PREFIX + text,
            normalize_embeddings=True,
            show_progress_bar=False,
        )


def encode_passages(texts: list[str]):
    """Encode documents; only used by the offline re-embedding script."""
    model = get_model()
    with _lock:
        return model.encode(
            [E5_PASSAGE_PREFIX + text for text in texts],
            normalize_embeddings=True,
            show_progress_bar=False,
        )
