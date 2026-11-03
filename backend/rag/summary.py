"""The short parent-facing progress summary.

The numbers come from SQLite; the model only turns them into prose. A deterministic
fallback is returned when the LLM is unavailable, so the progress tab never breaks
just because a provider is down.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.config import SUMMARY_MAX_TOKENS
from backend.rag.llm import invoke_text

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """তুমি "পাঠ সমাধান" অ্যাপের পক্ষ থেকে অভিভাবককে একটি সংক্ষিপ্ত রিপোর্ট লিখছো।
দেওয়া পরিসংখ্যানই একমাত্র সত্য; কোনো তথ্য বানাবে না, সংখ্যা বদলাবে না।

# নিয়ম
- ৩-৫ বাক্যের সহজ, সম্মানজনক বাংলা লেখো। বুলেট নয়, অনুচ্ছেদ আকারে।
- শিক্ষার্থীর নাম ব্যবহার করো এবং ২য় পুরুষের সম্ভ্রমসূচক ভাষায় (আপনার সন্তান) লিখো।
- কোন অধ্যায়ে ভালো করছে, কোন বিষয়ে দুর্বল, এবং অভিভাবক কীভাবে সাহায্য করতে পারেন — এই তিনটি দিক রাখো।
- পরিসংখ্যান না থাকলে সৎভাবে বলো যে এখনো যথেষ্ট তথ্য জমা হয়নি এবং একটি কুইজ দিয়ে শুরু করার পরামর্শ দাও।
- কর্কশ, নিন্দামূলক বা চাপ সৃষ্টিকারী ভাষা ব্যবহার করবে না।"""


def _digest(stats: dict[str, Any]) -> str:
    """Render the computed statistics as compact text for the prompt."""
    overall = stats.get("overall") or {}
    chapters = stats.get("chapters") or []
    topics = stats.get("weak_topics") or []

    lines = [
        f"শিক্ষার্থী: {stats.get('student', 'শিক্ষার্থী')}",
        f"মোট কুইজ: {overall.get('quiz_count', 0)}, মোট প্রশ্ন: {overall.get('questions', 0)}, "
        f"সঠিক: {overall.get('correct', 0)}, নির্ভুলতা: {overall.get('accuracy', 0)}%",
    ]

    if not chapters:
        lines.append("অধ্যায়ভিত্তিক কোনো তথ্য নেই (এখনো কোনো কুইজ দেওয়া হয়নি)।")
    else:
        lines.append("অধ্যায়ভিত্তিক ফল:")
        for chapter in chapters:
            lines.append(
                f"- {chapter['chapter']} ({chapter.get('subject_label') or chapter['subject']}): "
                f"নির্ভুলতা {chapter['accuracy']}%, কুইজ {chapter['quiz_count']}, "
                f"প্রশ্ন {chapter['questions']}"
            )

    if topics:
        lines.append("দুর্বল বিষয়:")
        for topic in topics:
            lines.append(
                f"- {topic['topic']} ({topic['chapter']}): {topic['correct']}/{topic['questions']} সঠিক"
            )
    else:
        lines.append("কোনো স্পষ্ট দুর্বল বিষয় পাওয়া যায়নি।")
    return "\n".join(lines)


def fallback_summary(stats: dict[str, Any]) -> str:
    """Used when no LLM provider answers; built only from the same numbers."""
    student = stats.get("student") or "শিক্ষার্থী"
    overall = stats.get("overall") or {}
    if not overall.get("questions"):
        return (
            f"{student}-এর এখনো কোনো কুইজের ফল সংরক্ষিত হয়নি। একটি অধ্যায় বেছে নিয়ে "
            "৫টি প্রশ্নের কুইজ দিলে এখানে অগ্রগতির হিসাব দেখা যাবে।"
        )

    best = (stats.get("chapters") or [{}])[0]
    weak = (stats.get("weak_topics") or [{}])[0]
    parts = [
        f"{student} এখন পর্যন্ত {overall.get('quiz_count', 0)}টি কুইজে "
        f"{overall.get('questions', 0)}টি প্রশ্নের উত্তর দিয়েছে এবং নির্ভুলতা "
        f"{overall.get('accuracy', 0)}%।",
    ]
    if best.get("chapter"):
        parts.append(f"সবচেয়ে ভালো ফল {best['chapter']} অধ্যায়ে ({best['accuracy']}%)।")
    if weak.get("topic"):
        parts.append(
            f"দুর্বলতা দেখা যাচ্ছে “{weak['topic']}” বিষয়ে ({weak['correct']}/{weak['questions']} সঠিক); "
            "এই অংশটি আবার পড়ে আরেকটি কুইজ দিলে উন্নতি বোঝা যাবে।"
        )
    else:
        parts.append("কোনো নির্দিষ্ট দুর্বল বিষয় এখনো ধরা পড়েনি।")
    return " ".join(parts)


def parent_summary(stats: dict[str, Any], *, student: str | None = None) -> dict[str, Any]:
    """Return {summary, source} — source is 'llm' or 'fallback'."""
    payload = dict(stats)
    payload.setdefault("student", student or "শিক্ষার্থী")
    user = f"নিচের পরিসংখ্যান দেখে অভিভাবকের জন্য সংক্ষিপ্ত রিপোর্ট লেখো।\n\n{_digest(payload)}"

    try:
        summary = invoke_text(SYSTEM_PROMPT, user, temperature=0.3, max_tokens=SUMMARY_MAX_TOKENS)
        if summary:
            return {"summary": summary, "source": "llm"}
        logger.warning("LLM returned an empty summary; using fallback")
    except Exception as exc:  # noqa: BLE001 - the report must render regardless
        logger.warning("Parent summary LLM failed (%s); using fallback", exc)

    return {"summary": fallback_summary(payload), "source": "fallback"}
