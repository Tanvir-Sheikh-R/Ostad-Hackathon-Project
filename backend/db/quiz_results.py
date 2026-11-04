"""Repository for quiz sessions and quiz results.

All SQL for the quiz/progress features lives here; the API layer only maps rows to
response models.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from backend.config import QUIZ_SESSION_TTL_HOURS
from backend.db.database import row_to_dict, session

# A topic counts as weak below this accuracy, provided at least one question was tried.
WEAK_TOPIC_THRESHOLD = 0.7


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def purge_expired_sessions(ttl_hours: int = QUIZ_SESSION_TTL_HOURS) -> int:
    """Drop half-finished quizzes so the table cannot grow without bound."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=ttl_hours)).isoformat(timespec="seconds")
    with session() as connection:
        cursor = connection.execute("DELETE FROM quiz_sessions WHERE created_at < ?", (cutoff,))
        return cursor.rowcount or 0


def save_session(
    *,
    quiz_id: str,
    student: str,
    context: dict[str, Any],
    questions: list[dict[str, Any]],
) -> None:
    """Persist a freshly generated quiz together with its answer key."""
    purge_expired_sessions()
    with session() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO quiz_sessions
                (quiz_id, student, class_id, class_label, subject, subject_label,
                 chapter, questions_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                quiz_id,
                student,
                context["class_id"],
                context.get("class_label", ""),
                context["subject"],
                context.get("subject_label", ""),
                context["chapter"],
                json.dumps(questions, ensure_ascii=False),
                now_iso(),
            ),
        )


def get_session(quiz_id: str) -> dict[str, Any] | None:
    """Load a pending quiz (with its answer key) or None when expired/unknown."""
    cutoff = (
        datetime.now(timezone.utc) - timedelta(hours=QUIZ_SESSION_TTL_HOURS)
    ).isoformat(timespec="seconds")
    with session() as connection:
        row = connection.execute(
            "SELECT * FROM quiz_sessions WHERE quiz_id = ? AND created_at >= ?",
            (quiz_id, cutoff),
        ).fetchone()

    document = row_to_dict(row)
    if document is None:
        return None
    document["questions"] = json.loads(document.pop("questions_json"))
    return document


def delete_session(quiz_id: str) -> None:
    """Remove a graded quiz so its submit cannot be replayed."""
    with session() as connection:
        connection.execute("DELETE FROM quiz_sessions WHERE quiz_id = ?", (quiz_id,))


def save_attempt(
    *,
    quiz_id: str,
    student: str,
    context: dict[str, Any],
    results: list[dict[str, Any]],
) -> int:
    """Write one row per question: student, subject, chapter, topic, correct, date."""
    stamp = now_iso()
    rows = [
        (
            quiz_id,
            student,
            context["class_id"],
            context["subject"],
            context.get("subject_label", ""),
            context["chapter"],
            item.get("topic") or "সাধারণ",
            item.get("chosen"),
            int(bool(item.get("correct"))),
            stamp,
        )
        for item in results
    ]
    if not rows:
        return 0

    with session() as connection:
        connection.executemany(
            """
            INSERT INTO quiz_results
                (quiz_id, student, class_id, subject, subject_label, chapter,
                 topic, option_index, is_correct, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
    return len(rows)


def _subject_clause(subject: str | None) -> tuple[str, tuple[Any, ...]]:
    """Optional subject filter shared by every progress query.

    Written as "? IS NULL OR subject = ?" so one prepared statement serves both the
    filtered and unfiltered report instead of string-building SQL.
    """
    return " AND (? IS NULL OR subject = ?)", (subject, subject)


def chapter_stats(student: str, subject: str | None = None) -> list[dict[str, Any]]:
    """Accuracy per chapter, strongest first (the progress table order)."""
    clause, params = _subject_clause(subject)
    with session() as connection:
        rows = connection.execute(
            f"""
            SELECT subject,
                   subject_label,
                   class_id,
                   chapter,
                   COUNT(DISTINCT quiz_id) AS quiz_count,
                   COUNT(*)                AS questions,
                   SUM(is_correct)         AS correct,
                   MAX(created_at)         AS last_at
            FROM quiz_results
            WHERE student = ?{clause}
            GROUP BY subject, subject_label, class_id, chapter
            ORDER BY CAST(SUM(is_correct) AS REAL) / COUNT(*) DESC, last_at DESC
            """,
            (student, *params),
        ).fetchall()

    stats: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        questions = int(item["questions"] or 0)
        correct = int(item["correct"] or 0)
        item["correct"] = correct
        item["questions"] = questions
        item["accuracy"] = round(100.0 * correct / questions, 1) if questions else 0.0
        item["average_score"] = item["accuracy"]
        stats.append(item)
    return stats


def weak_topics(student: str, limit: int = 5, subject: str | None = None) -> list[dict[str, Any]]:
    """Topics answered below WEAK_TOPIC_THRESHOLD, worst first."""
    clause, params = _subject_clause(subject)
    with session() as connection:
        rows = connection.execute(
            f"""
            SELECT subject, subject_label, class_id, chapter, topic,
                   COUNT(*)        AS questions,
                   SUM(is_correct) AS correct,
                   MAX(created_at) AS last_at
            FROM quiz_results
            WHERE student = ?{clause}
            GROUP BY subject, subject_label, class_id, chapter, topic
            ORDER BY CAST(SUM(is_correct) AS REAL) / COUNT(*) ASC,
                     COUNT(*) DESC,
                     last_at DESC
            """,
            (student, *params),
        ).fetchall()

    topics: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        questions = int(item["questions"] or 0)
        correct = int(item["correct"] or 0)
        accuracy = correct / questions if questions else 1.0
        if accuracy >= WEAK_TOPIC_THRESHOLD:
            continue
        item["correct"] = correct
        item["questions"] = questions
        item["accuracy"] = round(100.0 * accuracy, 1)
        topics.append(item)
        if len(topics) >= limit:
            break
    return topics


def overall_stats(student: str, subject: str | None = None) -> dict[str, Any]:
    clause, params = _subject_clause(subject)
    with session() as connection:
        row = connection.execute(
            f"""
            SELECT COUNT(DISTINCT quiz_id) AS quiz_count,
                   COUNT(*)                AS questions,
                   SUM(is_correct)         AS correct,
                   MIN(created_at)         AS first_at,
                   MAX(created_at)         AS last_at
            FROM quiz_results
            WHERE student = ?{clause}
            """,
            (student, *params),
        ).fetchone()

    item = row_to_dict(row) or {}
    quiz_count = int(item.get("quiz_count") or 0)
    questions = int(item.get("questions") or 0)
    correct = int(item.get("correct") or 0)
    return {
        "student": student,
        "quiz_count": quiz_count,
        "questions": questions,
        "correct": correct,
        "accuracy": round(100.0 * correct / questions, 1) if questions else 0.0,
        "first_at": item.get("first_at"),
        "last_at": item.get("last_at"),
    }


def recent_attempts(
    student: str, limit: int = 10, subject: str | None = None
) -> list[dict[str, Any]]:
    """One entry per finished quiz, newest first."""
    clause, params = _subject_clause(subject)
    with session() as connection:
        rows = connection.execute(
            f"""
            SELECT quiz_id,
                   subject,
                   subject_label,
                   class_id,
                   chapter,
                   COUNT(*)        AS questions,
                   SUM(is_correct) AS correct,
                   MIN(created_at) AS created_at
            FROM quiz_results
            WHERE student = ?{clause}
            GROUP BY quiz_id
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (student, *params, limit),
        ).fetchall()

    attempts: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        questions = int(item["questions"] or 0)
        correct = int(item["correct"] or 0)
        item["correct"] = correct
        item["questions"] = questions
        item["score"] = round(correct / questions, 2) if questions else 0.0
        attempts.append(item)
    return attempts


def subject_stats(student: str) -> list[dict[str, Any]]:
    """Subjects the student has actually been quizzed on — the progress-tab filter."""
    with session() as connection:
        rows = connection.execute(
            """
            SELECT subject,
                   subject_label,
                   class_id,
                   COUNT(DISTINCT quiz_id) AS quiz_count,
                   COUNT(*)                AS questions,
                   SUM(is_correct)         AS correct,
                   MAX(created_at)         AS last_at
            FROM quiz_results
            WHERE student = ?
            GROUP BY subject, subject_label, class_id
            ORDER BY last_at DESC
            """,
            (student,),
        ).fetchall()

    subjects: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        questions = int(item["questions"] or 0)
        correct = int(item["correct"] or 0)
        item["correct"] = correct
        item["questions"] = questions
        item["accuracy"] = round(100.0 * correct / questions, 1) if questions else 0.0
        subjects.append(item)
    return subjects


def delete_chapter_results(student: str, subject: str, chapter: str) -> int:
    """Delete every answered question for one chapter. Returns rows removed."""
    with session() as connection:
        cursor = connection.execute(
            "DELETE FROM quiz_results WHERE student = ? AND subject = ? AND chapter = ?",
            (student, subject, chapter),
        )
        return cursor.rowcount or 0


def delete_all_results(student: str) -> int:
    """Delete every answered question for one student. Returns rows removed."""
    with session() as connection:
        cursor = connection.execute("DELETE FROM quiz_results WHERE student = ?", (student,))
        return cursor.rowcount or 0


def student_list(limit: int = 50) -> list[str]:
    """Distinct students that have results — used to validate ?student= input."""
    with session() as connection:
        rows = connection.execute(
            "SELECT DISTINCT student FROM quiz_results ORDER BY student LIMIT ?", (limit,)
        ).fetchall()
    return [row["student"] for row in rows]


def progress_report(
    student: str,
    *,
    subject: str | None = None,
    weak_limit: int = 5,
    recent_limit: int = 10,
) -> dict[str, Any]:
    """Everything the progress tab renders, in one call.

    `subject` narrows every aggregate to one subject; the full subject list is always
    returned so the filter UI can offer every subject the student has quizzed on.
    """
    return {
        "student": student,
        "subjects": subject_stats(student),
        "overall": overall_stats(student, subject),
        "chapters": chapter_stats(student, subject),
        "weak_topics": weak_topics(student, limit=weak_limit, subject=subject),
        "recent": recent_attempts(student, limit=recent_limit, subject=subject),
    }
