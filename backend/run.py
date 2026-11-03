"""Start the পাঠ সমাধান API.

    python -m backend.run          # or: python -m backend.app under uvicorn

The first start loads the e5 encoder (~1 s from model_cache/e5-base); after that the
model stays resident and each question only pays for retrieval plus generation.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import uvicorn

# Allow "python backend/run.py" from the project root as well as "python -m backend.run".
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
WORKERS = int(os.getenv("WEB_CONCURRENCY", "1"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")


def main() -> None:
    reload_enabled = os.getenv("RELOAD", "false").lower() in ("true", "1", "yes")
    # The encoder is ~1 GB per process, so more workers means more memory, not more
    # speed: this workload is I/O-bound on the LLM and single-threaded on FAISS.
    uvicorn.run(
        "backend.app:app",
        host=HOST,
        port=PORT,
        log_level=LOG_LEVEL,
        reload=reload_enabled,
        workers=1 if reload_enabled else max(1, WORKERS),
    )


if __name__ == "__main__":
    main()
