"""End-to-end check of the পাঠ সমাধান API.

    python scripts/api_smoke_test.py                    # English run, in-process
    python scripts/api_smoke_test.py --lang bn          # same run in Bangla
    python scripts/api_smoke_test.py --base-url URL     # against a deployed backend

Covers health, catalog (+ETag revalidation), quiz generate/submit, progress, the
LLM parent summary, and a streamed chat turn. The quiz and summary are real LLM calls,
so this needs GROQ_API_KEY or DEEPSEEK_API_KEY.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

STUDENT = {"en": "Test Student", "bn": "টেস্ট শিক্ষার্থী"}
MESSAGE = {
    "en": "Summarise the main points of this chapter briefly.",
    "bn": "এই অধ্যায়ের মূল বিষয় সংক্ষেপে বলো।",
}
LANGUAGE = "en"

_BANGLA = re.compile(r"[\u0980-\u09FF]")


def _bangla_ratio(text: str) -> float:
    letters = [char for char in text if char.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for char in letters if _BANGLA.match(char)) / len(letters)


def _show(title: str) -> None:
    print(f"\n=== {title} " + "=" * max(0, 60 - len(title)))


def _headers() -> dict[str, str]:
    """The UI language travels on every request, like the web client does."""
    return {"X-Client-Lang": LANGUAGE}


def _exercise(client) -> int:
    failures = 0
    student = STUDENT[LANGUAGE]

    _show(f"health ({LANGUAGE})")
    response = client.get("/api/health", headers=_headers())
    print(response.status_code, json.dumps(response.json(), ensure_ascii=False)[:400])
    failures += response.status_code != 200

    _show("catalog")
    response = client.get("/api/catalog", headers=_headers())
    catalog = response.json()
    print(response.status_code, "counts:", catalog.get("counts"), "etag:", response.headers.get("etag"))
    failures += response.status_code != 200
    if response.headers.get("etag"):
        again = client.get(
            "/api/catalog", headers={**_headers(), "If-None-Match": response.headers["etag"]}
        )
        print("revalidation ->", again.status_code)
        failures += again.status_code != 304

    class_node = catalog["classes"][0]
    subject = class_node["subjects"][0]
    indexed = [chapter for chapter in subject["chapters"] if chapter.get("indexed")]
    if not indexed:
        print("!! no indexed chapter in the first subject")
        return failures + 1

    # English labels must be shipped alongside the Bangla ones.
    print("class labels:", class_node["label"], "|", class_node.get("label_en"))
    failures += 0 if class_node.get("label_en") else 1

    context = {
        "class_id": class_node["class_id"],
        "class_label": class_node["label_en"] if LANGUAGE == "en" else class_node["label"],
        "subject": subject["subject"],
        "subject_label": subject["label_en"] if LANGUAGE == "en" else subject["label"],
        "stream": subject["stream"],
        "book": subject["book"],
        "chapter": indexed[0]["name"],
        "language": LANGUAGE,
    }
    print("context:", context["book"], "/", context["chapter"], "|", context["subject_label"])

    _show("quiz generate")
    response = client.post(
        "/api/quiz/generate",
        json={"context": context, "student": student, "count": 5},
        headers=_headers(),
    )
    print(response.status_code)
    if response.status_code != 200:
        print(response.text[:700])
        return failures + 1

    quiz = response.json()
    for number, question in enumerate(quiz["questions"], start=1):
        print(f"{number}. [{question['topic']}] {question['question']}")
        for index, option in enumerate(question["options"]):
            print(f"   {'*' if index == question['answer'] else ' '}{index}) {option}")

    ratio = _bangla_ratio(" ".join(q["question"] + " " + q["explanation"] for q in quiz["questions"]))
    print(f"bangla ratio in questions: {ratio:.2f} (expected {'high' if LANGUAGE == 'bn' else 'low'})")
    # A wrong-language quiz means the prompt/parameter plumbing broke.
    failures += 0 if (ratio > 0.5) == (LANGUAGE == "bn") else 1

    _show("quiz submit (two answers forced wrong)")
    answers = [question["answer"] for question in quiz["questions"]]
    answers[0] = (answers[0] + 1) % 4
    answers[-1] = (answers[-1] + 2) % 4
    response = client.post(
        "/api/quiz/submit",
        json={"quiz_id": quiz["quiz_id"], "student": student, "answers": answers},
        headers=_headers(),
    )
    print(response.status_code)
    if response.status_code != 200:
        print(response.text[:700])
        return failures + 1
    graded = response.json()
    print(f"score {graded['correct']}/{graded['total']} = {graded['score']}, rows saved={graded['saved_rows']}")
    for item in graded["results"]:
        flag = "OK " if item["correct"] else "BAD"
        print(f"  {flag} chosen={item['chosen']} answer={item['answer']} :: {item['question'][:60]}")
    failures += graded["saved_rows"] != graded["total"]

    _show("replayed submit must fail")
    response = client.post(
        "/api/quiz/submit",
        json={"quiz_id": quiz["quiz_id"], "student": student, "answers": answers},
        headers=_headers(),
    )
    print(response.status_code, "(expected 404)")
    failures += response.status_code != 404

    _show("progress")
    response = client.get(
        "/api/progress", params={"student": student}, headers=_headers()
    )
    print(response.status_code)
    if response.status_code != 200:
        print(response.text[:700])
        return failures + 1
    progress = response.json()
    print("overall:", json.dumps(progress["overall"], ensure_ascii=False))
    for chapter in progress["chapters"]:
        print(f"  {chapter['chapter']}: {chapter['correct']}/{chapter['questions']} = {chapter['accuracy']}%")
    for topic in progress["weak_topics"]:
        print(f"  weak: {topic['topic']} {topic['correct']}/{topic['questions']} ({topic['accuracy']}%)")
    if not progress["chapters"]:
        failures += 1

    _show("progress summary")
    response = client.get(
        "/api/progress/summary", params={"student": student}, headers=_headers()
    )
    print(response.status_code, "source:", response.json().get("source"))
    if response.status_code != 200:
        print(response.text[:700])
        return failures + 1
    summary = response.json()["summary"]
    print(summary)
    summary_ratio = _bangla_ratio(summary)
    print(f"bangla ratio in summary: {summary_ratio:.2f}")
    failures += 0 if (summary_ratio > 0.5) == (LANGUAGE == "bn") else 1

    _show("chat")
    response = client.post("/api/threads", json={"context": context}, headers=_headers())
    print("thread create:", response.status_code)
    failures += response.status_code != 200
    if response.status_code == 200:
        thread = response.json()
        print("thread title:", thread.get("title"))
        thread_id = thread["thread_id"]
        events: list[dict] = []
        with client.stream(
            "POST",
            f"/api/threads/{thread_id}/chat",
            json={"message": MESSAGE[LANGUAGE], "context": context},
            headers=_headers(),
        ) as stream:
            for line in stream.iter_lines():
                if line.strip():
                    events.append(json.loads(line))
        kinds = [event["type"] for event in events]
        answer = "".join(event.get("text", "") for event in events if event["type"] == "delta")
        statuses = [event["message"] for event in events if event["type"] == "status"]
        print("status events:", statuses)
        print("events:", {kind: kinds.count(kind) for kind in set(kinds)})
        print("answer head:", answer[:160].replace("\n", " "))
        failures += 0 if "done" in kinds and answer else 1
        answer_ratio = _bangla_ratio(answer)
        print(f"bangla ratio in answer: {answer_ratio:.2f}")
        failures += 0 if (answer_ratio > 0.5) == (LANGUAGE == "bn") else 1

    _show("result")
    print("FAILURES:", failures)
    return 0 if failures == 0 else 1


def main() -> int:
    global LANGUAGE

    parser = argparse.ArgumentParser(description="Smoke-test the পাঠ সমাধান API")
    parser.add_argument("--base-url", help="Test a deployed backend instead of the in-process app")
    parser.add_argument("--lang", choices=("en", "bn"), default="en", help="UI language to test")
    args = parser.parse_args()
    LANGUAGE = args.lang

    sys.stdout.reconfigure(encoding="utf-8")

    if args.base_url:
        import httpx

        with httpx.Client(base_url=args.base_url.rstrip("/"), timeout=180.0) as client:
            return _exercise(client)

    from fastapi.testclient import TestClient

    from backend.app import app

    with TestClient(app) as client:
        return _exercise(client)


if __name__ == "__main__":
    raise SystemExit(main())
