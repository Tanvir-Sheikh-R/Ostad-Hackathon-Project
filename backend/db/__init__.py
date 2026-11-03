"""SQLite persistence: schema bootstrap plus the quiz/progress repository."""

from backend.db.database import init_db, session
from backend.db.quiz_results import (
    chapter_stats,
    delete_session,
    get_session,
    now_iso,
    overall_stats,
    progress_report,
    purge_expired_sessions,
    recent_attempts,
    save_attempt,
    save_session,
    weak_topics,
)

__all__ = [
    "init_db",
    "session",
    "chapter_stats",
    "delete_session",
    "get_session",
    "now_iso",
    "overall_stats",
    "progress_report",
    "purge_expired_sessions",
    "recent_attempts",
    "save_attempt",
    "save_session",
    "weak_topics",
]
