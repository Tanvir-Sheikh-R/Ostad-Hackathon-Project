"""Paths, model ids and tunables for the পাঠ সমাধান API.

Reads the artifacts produced by pipeline/pdf_to_document_cleanV2.ipynb
(chapters.json, embedding_cache/) and writes only under backend/data/.
Every value can be overridden from the environment, which is how the AWS
container is pointed at its mounted volumes.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent

# Loads GROQ / DeepSeek / OpenRouter keys used by the answer and quiz chains.
load_dotenv(ROOT / ".env")


def _path(name: str, default: Path) -> Path:
    """Read a path override from the environment, resolved against the repo root."""
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    candidate = Path(raw)
    return candidate if candidate.is_absolute() else (ROOT / candidate).resolve()


# --- read-only pipeline artifacts -------------------------------------------------
CHAPTERS_INDEX = _path("CHAPTERS_INDEX", ROOT / "chapters.json")
EMBEDDING_CACHE = _path("EMBEDDING_CACHE", ROOT / "embedding_cache")

# --- writable runtime state -------------------------------------------------------
DATA_DIR = _path("DATA_DIR", ROOT / "backend" / "data")
THREADS_DIR = DATA_DIR / "threads"
DB_PATH = _path("DB_PATH", DATA_DIR / "study.db")

# Chat history is kept per browser for this many days, then purged automatically.
THREAD_RETENTION_DAYS = int(os.getenv("THREAD_RETENTION_DAYS", "3"))

# --- embeddings -------------------------------------------------------------------
# A plain, flattened model directory (config.json + model.safetensors + tokenizer).
# Loading it by path avoids the huggingface_hub cache scan entirely, which is what
# made a cold start slow when model_cache held five copies of the same weights.
EMBEDDING_MODEL_DIR = _path("EMBEDDING_MODEL_DIR", ROOT / "model_cache" / "e5-base")
EMBEDDING_MODEL_ID = os.getenv("EMBEDDING_MODEL_ID", "intfloat/multilingual-e5-base")

# Must match the dimension the pipeline wrote into every index.faiss. A query encoded
# by a different model raises a FAISS dimension error, so this is asserted at startup
# rather than silently returning nonsense neighbours.
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "768"))

E5_QUERY_PREFIX = "query: "
E5_PASSAGE_PREFIX = "passage: "
# 0 leaves torch's default thread count alone.
EMBEDDING_THREADS = int(os.getenv("EMBEDDING_THREADS", "0"))
EMBEDDING_DEVICE = os.getenv("EMBEDDING_DEVICE", "").strip()  # "" = cuda when available

# --- hybrid retrieval (notebook defaults: k=5, weights 0.4 BM25 / 0.6 dense) ------
HYBRID_K = int(os.getenv("HYBRID_K", "5"))
HYBRID_WEIGHTS = (0.4, 0.6)

# --- LLM --------------------------------------------------------------------------
# Provider order is tried left to right; a provider without an API key is skipped.
LLM_PROVIDER_ORDER = tuple(
    name.strip().lower()
    for name in os.getenv("LLM_PROVIDER_ORDER", "groq,deepseek").split(",")
    if name.strip()
)
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.4"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "2048"))
QUIZ_MAX_TOKENS = int(os.getenv("QUIZ_MAX_TOKENS", "3000"))
SUMMARY_MAX_TOKENS = int(os.getenv("SUMMARY_MAX_TOKENS", "700"))

# --- quiz -------------------------------------------------------------------------
QUIZ_QUESTION_COUNT = int(os.getenv("QUIZ_QUESTION_COUNT", "5"))
QUIZ_OPTION_COUNT = 4
# How many chapter chunks are handed to the model as the exam's source material.
QUIZ_CONTEXT_CHUNKS = int(os.getenv("QUIZ_CONTEXT_CHUNKS", "8"))
QUIZ_SESSION_TTL_HOURS = int(os.getenv("QUIZ_SESSION_TTL_HOURS", "24"))

# --- catalog scope ----------------------------------------------------------------
# The picker only offers these classes. class_9_10 holds the indexed NCTB books.
CATALOG_CLASSES = tuple(
    name.strip()
    for name in os.getenv("CATALOG_CLASSES", "class_9_10").split(",")
    if name.strip()
)
CATALOG_MAX_AGE = int(os.getenv("CATALOG_MAX_AGE", "3600"))

# --- CORS -------------------------------------------------------------------------
# Whatever the deployment configures, plus the local development origins, so a
# production .env listing only the public host cannot lock a developer out of their
# own machine. A blocked origin reaches the browser as a bare "Failed to fetch".
_LOCAL_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://127.0.0.1",
)
_configured_origins = tuple(
    origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()
)
CORS_ORIGINS = tuple(dict.fromkeys((*_configured_origins, *_LOCAL_ORIGINS)))
# Vercel preview deployments get a random host per build; this suffix lets them call
# the API without redeploying the backend for every pull request.
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app").strip() or None
