"""Build chapter_titles_en.json: English titles for every catalog chapter.

`chapters.json` only carries Bangla chapter titles, but the UI defaults to English, so
the picker needs English labels. This script translates them once with the LLM and
writes a lookup keyed by "book::chapter" — the exact key the backend resolves at
request time. It is resumable: titles already present are skipped, and the file is
rewritten after every batch.

    python scripts/translate_chapters.py              # translate what is missing
    python scripts/translate_chapters.py --dry-run    # show what would be translated
    python scripts/translate_chapters.py --batch 20   # smaller LLM batches

The catalog chapter key always stays the Bangla name: it is what the vector store is
indexed by. Only the display label changes.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import CHAPTER_TITLES_EN  # noqa: E402
from backend.rag.chapters import catalog  # noqa: E402
from backend.rag.i18n import QUIZ_GENERIC_TOPIC  # noqa: E402
from backend.rag.llm import invoke_json  # noqa: E402

SYSTEM_PROMPT = """You localise a Bangladeshi NCTB (national curriculum) textbook app.
You receive chapter titles taken from Bangla textbooks, with the subject they belong to.
Translate each title into natural, concise English as a student would see it in a
textbook table of contents.

# Rules
- Translate, do not transliterate, unless the title is a proper noun (a person, place,
  literary work or character name): then use the standard English spelling.
- Keep any leading numbering out of the translation; the app adds it.
- Keep titles short: at most 8 words, no quotes, no trailing punctuation.
- Never merge, split or reorder ids. Echo every id exactly as given.
- Reply with JSON only.

# Output format
{"translations": {"<id>": "<english title>"}}"""


def _collect() -> list[dict[str, str]]:
    """Every catalog chapter as {id, book, subject, title}."""
    items: list[dict[str, str]] = []
    for class_node in catalog()["classes"]:
        for subject in class_node["subjects"]:
            for chapter in subject["chapters"]:
                items.append(
                    {
                        "id": f"{subject['book']}::{chapter['name']}",
                        "book": subject["book"],
                        "subject": subject["label_en"] or subject["label"],
                        "title": chapter["name"],
                    }
                )
    return items


def _load() -> dict[str, str]:
    if not CHAPTER_TITLES_EN.exists():
        return {}
    try:
        data = json.loads(CHAPTER_TITLES_EN.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print(f"!! {CHAPTER_TITLES_EN} is not valid JSON; starting fresh")
        return {}
    return {str(key): str(value) for key, value in data.items()}


def _save(translations: dict[str, str]) -> None:
    ordered = dict(sorted(translations.items()))
    CHAPTER_TITLES_EN.write_text(
        json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def _validate(payload: object, expected_ids: set[str]) -> dict[str, str]:
    items = payload.get("translations") if isinstance(payload, dict) else payload
    if not isinstance(items, dict):
        raise ValueError("expected {'translations': {id: title}}")

    result: dict[str, str] = {}
    for key, value in items.items():
        if key not in expected_ids:
            continue
        title = " ".join(str(value).split())
        if not title:
            continue
        result[key] = title[:120]

    missing = expected_ids - set(result)
    if missing:
        raise ValueError(f"{len(missing)} ids missing, e.g. {sorted(missing)[:3]}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Translate chapter titles to English")
    parser.add_argument("--batch", type=int, default=25, help="titles per LLM call")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")

    items = _collect()
    existing = _load()
    pending = [item for item in items if item["id"] not in existing]

    print(f"catalog chapters: {len(items)}")
    print(f"already translated: {len(items) - len(pending)}")
    print(f"pending: {len(pending)}  ->  {CHAPTER_TITLES_EN}")

    if args.dry_run or not pending:
        for item in pending[:10]:
            print(f"  {item['book']} :: {item['title']}")
        return 0

    total_done = 0
    for start in range(0, len(pending), args.batch):
        batch = pending[start : start + args.batch]
        expected = {item["id"] for item in batch}
        listing = "\n".join(
            f"{item['id']} | subject: {item['subject']} | {item['title']}" for item in batch
        )
        user = f"Translate these {len(batch)} chapter titles:\n\n{listing}"

        try:
            translated = invoke_json(
                SYSTEM_PROMPT,
                user,
                temperature=0.2,
                max_tokens=2500,
                validate=lambda payload: _validate(payload, expected),
            )
        except Exception as exc:  # noqa: BLE001 - keep earlier batches, report the rest
            print(f"!! batch {start // args.batch + 1} failed: {exc}")
            _save({**existing, **_load()})
            return 1

        existing.update(translated)
        _save(existing)
        total_done += len(translated)
        print(f"batch {start // args.batch + 1}: +{len(translated)} (total {len(existing)})")

    remaining = [item for item in items if item["id"] not in existing]
    print(f"done: {total_done} new, {len(existing)} stored, {len(remaining)} remaining")
    return 0 if not remaining else 1


if __name__ == "__main__":
    raise SystemExit(main())
