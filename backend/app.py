"""পাঠ সমাধান FastAPI application.

Thin by design: this module owns the app factory, middleware and startup work, and
nothing else. Endpoints live in backend/api/*, retrieval in backend/rag/*.
"""

# NOTE: no "from __future__ import annotations" here. FastAPI resolves endpoint
# annotations at import time, and PEP 563 string annotations break Pydantic models
# used as request bodies (they degrade to query parameters).

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from backend.api import catalog as catalog_api
from backend.api import chat, health, progress, quiz
from backend.config import CORS_ORIGINS, CORS_ORIGIN_REGEX
from backend.db import init_db
from backend.rag import embeddings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
logger = logging.getLogger("patsomadhan")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Prepare everything the first request needs: schema, encoder, catalog."""
    init_db()
    try:
        info = embeddings.warm_up()
        logger.info("Encoder ready: %s (%s-d on %s)", info["model"], info["dimension"], info["device"])
    except Exception:  # noqa: BLE001 - startup must not hard-fail; retried on first query
        logger.exception("Encoder warm-up failed; it will retry on the first question")

    try:
        payload, version = catalog_api.catalog_payload(refresh=True)
        logger.info(
            "Catalog ready: %s classes, %s chapters (%s indexed), version %s",
            payload["counts"]["classes"],
            payload["counts"]["chapters"],
            payload["counts"]["indexed_chapters"],
            version,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Catalog build failed; the picker will rebuild it on demand")

    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="বই বন্ধু (Boi Bondhu) API",
        description="NCTB পাঠ্যবইয়ের ওপর ভিত্তি করে চ্যাট, কুইজ ও অগ্রগতি রিপোর্ট।",
        version="2.1.0",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(CORS_ORIGINS),
        allow_origin_regex=CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["ETag"],
    )
    # The catalog is a few hundred KB of JSON; gzip makes a cold load far cheaper.
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    @app.middleware("http")
    async def report_cors_rejections(request: Request, call_next):
        """Name the offending origin when CORSMiddleware answers a preflight with 400.

        The browser reports a blocked preflight as a bare network error, so the server
        log is the only place the real origin is visible.
        --- this is a demo ---
        """
        response = await call_next(request)
        if request.method == "OPTIONS" and response.status_code == 400:
            logger.warning(
                "CORS preflight rejected: Origin=%r is not allowed by %s (regex=%r)",
                request.headers.get("origin"),
                list(CORS_ORIGINS),
                CORS_ORIGIN_REGEX,
            )
        return response

    for router in (health.router, catalog_api.router, chat.router, quiz.router, progress.router):
        app.include_router(router)

    @app.get("/", tags=["system"])
    def index() -> dict[str, object]:
        return {
            "service": "পাঠ সমাধান API",
            "version": app.version,
            "docs": "/api/docs",
            "health": "/api/health",
        }

    return app


app = create_app()
