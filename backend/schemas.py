"""Pydantic request/response models for the পাঠ সমাধান API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from backend.config import QUIZ_QUESTION_COUNT
from backend.rag.i18n import Language

# Longest student name accepted anywhere; also the SQLite column's practical limit.
_STUDENT_MAX = 64


def _clean_text(value: str, *, limit: int) -> str:
    cleaned = " ".join(str(value).split())
    if not cleaned:
        raise ValueError("must not be blank")
    return cleaned[:limit]


class ChapterContext(BaseModel):
    """The single chapter a chat, quiz or report is scoped to.

    `language` rides along with the chapter on every request: it drives the answer,
    quiz and summary language, and the labels stored on a thread's title.
    """

    class_id: str = Field(min_length=1)
    class_label: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    subject_label: str = Field(min_length=1)
    stream: str | None = None
    book: str = Field(min_length=1)
    chapter: str = Field(min_length=1)
    # Display title for `chapter` (English when available); `chapter` itself stays the
    # Bangla key the vector store is indexed by.
    chapter_label: str | None = None
    language: Language = "en"

    @property
    def title(self) -> str:
        return f"{self.chapter} · {self.subject_label} · {self.class_label}"


# --- threads (chat history) -------------------------------------------------------


class ThreadCreate(BaseModel):
    context: ChapterContext


class ThreadContextUpdate(BaseModel):
    context: ChapterContext


class ThreadRename(BaseModel):
    title: str = Field(min_length=1, max_length=120)

    @field_validator("title")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        return _clean_text(value, limit=120)


class ChatMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

    @field_validator("message")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        return _clean_text(value, limit=4000)


class ChatStart(ChatMessageIn):
    context: ChapterContext


class MessageOut(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ThreadSummary(BaseModel):
    thread_id: str
    title: str
    context: dict[str, Any]
    message_count: int
    preview: str
    created_at: str
    updated_at: str


class ThreadDetail(BaseModel):
    thread_id: str
    title: str
    context: dict[str, Any]
    messages: list[MessageOut]
    created_at: str
    updated_at: str


class ThreadGroup(BaseModel):
    label: str
    threads: list[ThreadSummary]


# --- quiz -------------------------------------------------------------------------


class QuizGenerateRequest(BaseModel):
    context: ChapterContext
    student: str = Field(default="শিক্ষার্থী")
    count: int = Field(default=QUIZ_QUESTION_COUNT, ge=1, le=10)

    @field_validator("student")
    @classmethod
    def _clean_student(cls, value: str) -> str:
        return _clean_text(value, limit=_STUDENT_MAX)


class QuizQuestionOut(BaseModel):
    """One MCQ. `answer` is the 0-based index of the correct option."""

    id: str
    question: str
    options: list[str]
    answer: int
    topic: str
    explanation: str


class QuizGenerateResponse(BaseModel):
    quiz_id: str
    student: str
    context: dict[str, Any]
    chapter: str
    subject_label: str
    questions: list[QuizQuestionOut]
    generated_at: str
    provider_note: str = ""


class QuizSubmitRequest(BaseModel):
    quiz_id: str = Field(min_length=1, max_length=64)
    student: str = Field(default="শিক্ষার্থী")
    answers: list[int | None] = Field(default_factory=list, max_length=20)

    @field_validator("student")
    @classmethod
    def _clean_student(cls, value: str) -> str:
        return _clean_text(value, limit=_STUDENT_MAX)


class QuizResultOut(BaseModel):
    id: str | None = None
    question: str
    options: list[str]
    topic: str
    chosen: int | None
    answer: int
    correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    quiz_id: str
    student: str
    context: dict[str, Any]
    chapter: str
    subject_label: str
    correct: int
    total: int
    score: float
    results: list[QuizResultOut]
    saved_rows: int


# --- progress ---------------------------------------------------------------------


class ChapterStat(BaseModel):
    subject: str
    subject_label: str = ""
    class_id: str = ""
    chapter: str
    # Display title in the request language (English when available).
    chapter_label: str = ""
    quiz_count: int
    questions: int
    correct: int
    accuracy: float
    average_score: float
    last_at: str | None = None


class TopicStat(BaseModel):
    subject: str
    subject_label: str = ""
    class_id: str = ""
    chapter: str
    chapter_label: str = ""
    topic: str
    questions: int
    correct: int
    accuracy: float
    last_at: str | None = None


class OverallStats(BaseModel):
    student: str
    quiz_count: int
    questions: int
    correct: int
    accuracy: float
    first_at: str | None = None
    last_at: str | None = None


class RecentAttempt(BaseModel):
    quiz_id: str
    subject: str
    subject_label: str = ""
    class_id: str = ""
    chapter: str
    chapter_label: str = ""
    questions: int
    correct: int
    score: float
    created_at: str


class ProgressResponse(BaseModel):
    student: str
    overall: OverallStats
    chapters: list[ChapterStat]
    weak_topics: list[TopicStat]
    recent: list[RecentAttempt]


class SummaryResponse(BaseModel):
    student: str
    summary: str
    source: Literal["llm", "fallback"]
    overall: OverallStats
    generated_at: str


# --- system -----------------------------------------------------------------------


class HealthOut(BaseModel):
    status: Literal["ok", "degraded"]
    embedding_model: str
    device: str
    dimension: int
    llm_providers: list[str]
    catalog_classes: list[str]
    indexed_books: int
    indexed_chapters: int
    quiz_question_count: int
    thread_retention_days: int
    detail: str = ""
