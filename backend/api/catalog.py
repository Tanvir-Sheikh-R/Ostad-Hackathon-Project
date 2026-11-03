"""The chapter catalog the picker renders.

Served with an ETag and a long max-age, so a returning student revalidates with one
cheap 304 instead of re-downloading the whole class → subject → chapter tree.
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from backend.config import CATALOG_CLASSES, CATALOG_MAX_AGE
from backend.rag import chapters

router = APIRouter(prefix="/api", tags=["catalog"])

_CACHE_CONTROL = f"public, max-age={CATALOG_MAX_AGE}, stale-while-revalidate=86400"

_lock = threading.Lock()
_cache: dict[str, Any] = {"payload": None, "version": "", "built": 0.0}


def catalog_payload(refresh: bool = False) -> tuple[dict[str, Any], str]:
    """Build (and memoise) the catalog body plus its content hash."""
    now = time.monotonic()
    with _lock:
        cached = _cache["payload"]
        fresh = cached is not None and (now - float(_cache["built"])) < max(CATALOG_MAX_AGE, 1)
        if fresh and not refresh:
            return cached, str(_cache["version"])

        data = chapters.catalog()
        body = json.dumps(data, ensure_ascii=False, sort_keys=True)
        version = hashlib.sha256(body.encode("utf-8")).hexdigest()[:16]
        payload: dict[str, Any] = {
            **data,
            "version": version,
            "catalog_classes": list(CATALOG_CLASSES),
            "built_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        _cache.update(payload=payload, version=version, built=now)
        return payload, version


@router.get("/catalog")
def get_catalog(request: Request):
    """Classes → subjects → chapters, limited to the indexed classes."""
    payload, version = catalog_payload()
    etag = f'"{version}"'
    headers = {"ETag": etag, "Cache-Control": _CACHE_CONTROL}

    if request.headers.get("if-none-match") in (etag, f"W/{etag}"):
        return Response(status_code=304, headers=headers)
    return JSONResponse(payload, headers=headers)
