"""SQLite access: one connection per operation, WAL journal, schema created on startup.

The database holds two things:
  quiz_sessions  the pending quiz a student is answering (full MCQ incl. answer key)
  quiz_results   one row per answered question — the permanent progress record

Storing the answer key server-side keeps grading authoritative even though the
generated JSON also carries it to the browser.
"""

from __future__ import annotations

import logging
import sqlite3
import threading
from contextlib import contextmanager
from typing import Any, Iterator

from backend.config import DB_PATH

logger = logging.getLogger(__name__)

_SCHEMA = (
    """
    CREATE TABLE IF NOT EXISTS quiz_sessions (
        quiz_id        TEXT PRIMARY KEY,
        student        TEXT NOT NULL,
        class_id       TEXT NOT NULL,
        class_label    TEXT NOT NULL DEFAULT '',
        subject        TEXT NOT NULL,
        subject_label  TEXT NOT NULL DEFAULT '',
        chapter        TEXT NOT NULL,
        questions_json TEXT NOT NULL,
        created_at     TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS quiz_results (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id       TEXT NOT NULL,
        student       TEXT NOT NULL,
        class_id      TEXT NOT NULL,
        subject       TEXT NOT NULL,
        subject_label TEXT NOT NULL DEFAULT '',
        chapter       TEXT NOT NULL,
        topic         TEXT NOT NULL,
        option_index  INTEGER,
        is_correct    INTEGER NOT NULL,
        created_at    TEXT NOT NULL
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_results_student ON quiz_results(student, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_results_chapter ON quiz_results(student, subject, chapter)",
    "CREATE INDEX IF NOT EXISTS idx_results_quiz ON quiz_results(quiz_id)",
)

_init_lock = threading.Lock()
_initialised = False


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(DB_PATH), timeout=30.0)
    connection.row_factory = sqlite3.Row
    return connection


@contextmanager
def session() -> Iterator[sqlite3.Connection]:
    """Transactional connection: commits on success, rolls back on any exception."""
    connection = _connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db() -> None:
    """Create the schema once per process. Safe to call from the app lifespan."""
    global _initialised
    with _init_lock:
        if _initialised:
            return
        with session() as connection:
            # WAL lets the quiz writer and the progress reader run concurrently.
            connection.execute("PRAGMA journal_mode = WAL")
            connection.execute("PRAGMA synchronous = NORMAL")
            for statement in _SCHEMA:
                connection.execute(statement)
        _initialised = True
        logger.info("SQLite ready at %s", DB_PATH)


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


__all__ = ["session", "init_db", "row_to_dict"]
