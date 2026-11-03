"""End-to-end check of the পাঠ সমাধান API.

    python scripts/api_smoke_test.py                    # in-process, no server needed
    python scripts/api_smoke_test.py --base-url URL      # against a deployed backend

Covers health, catalog (+ETag revalidation), quiz generate/submit, progress, the
LLM parent summary, and a streamed chat turn. The quiz and summary are real LLM calls,
so this needs GROQ_API_KEY or DEEPSEEK_API_KEY.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

STUDENT = "টেস্ট শিক্ষার্থী"


def _show(title: str) -> None:
    print(f"\n=== {title} " + "=" * max(0, 60 - len(title)))


def _exercise(client) -> int:
    failures = 0

    _show("health")
    response = client.get("/api/health")
    print(response.status_code, json.dumps(response.json(), ensure_ascii=False)[:400])
    failures += response.status_code != 200

    _show("catalog")
    response = client.get("/api/catalog")
    catalog = response.json()
    print(response.status_code, "counts:", catalog.get("counts"), "etag:", response.headers.get("etag"))
    failures += response.status_code != 200
    if response.headers.get("etag"):
        again = client.get("/api/catalog", headers={"If-None-Match": response.headers["etag"]})
        print("revalidation ->", again.status_code)
        failures += again.status_code != 304

    class_node = catalog["classes"][0]
    subject = class_node["subjects"][0]
    indexed = [chapter for chapter in subject["chapters"] if chapter.get("indexed")]
    if not indexed:
        print("!! no indexed chapter in the first subject")
        return failures + 1

    context = {
        "class_id": class_node["class_id"],
        "class_label": class_node["label"],
        "subject": subject["subject"],
        "subject_label": subject["label"],
        "stream": subject["stream"],
        "book": subject["book"],
        "chapter": indexed[0]["name"],
    }
    print("context:", context["book"], "/", context["chapter"])

    _show("quiz generate")
    response = client.post(
        "/api/quiz/generate", json={"context": context, "student": STUDENT, "count": 5}
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

    _show("quiz submit (two answers forced wrong)")
    answers = [question["answer"] for question in quiz["questions"]]
    answers[0] = (answers[0] + 1) % 4
    answers[-1] = (answers[-1] + 2) % 4
    response = client.post(
        "/api/quiz/submit",
        json={"quiz_id": quiz["quiz_id"], "student": STUDENT, "answers": answers},
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
        json={"quiz_id": quiz["quiz_id"], "student": STUDENT, "answers": answers},
    )
    print(response.status_code, "(expected 404)")
    failures += response.status_code != 404

    _show("progress")
    response = client.get("/api/progress", params={"student": STUDENT})
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
    response = client.get("/api/progress/summary", params={"student": STUDENT})
    print(response.status_code, "source:", response.json().get("source"))
    if response.status_code != 200:
        print(response.text[:700])
        return failures + 1
    print(response.json()["summary"])

    _show("chat")
    response = client.post("/api/threads", json={"context": context})
    print("thread create:", response.status_code)
    failures += response.status_code != 200
    if response.status_code == 200:
        thread_id = response.json()["thread_id"]
        events: list[dict] = []
        with client.stream(
            "POST",
            f"/api/threads/{thread_id}/chat",
            json={"message": "এই অধ্যায়ের মূল বিষয় সংক্ষেপে বলো।", "context": context},
        ) as stream:
            for line in stream.iter_lines():
                if line.strip():
                    events.append(json.loads(line))
        kinds = [event["type"] for event in events]
        answer = "".join(event.get("text", "") for event in events if event["type"] == "delta")
        print("events:", {kind: kinds.count(kind) for kind in set(kinds)})
        print("answer head:", answer[:160].replace("\n", " "))
        failures += 0 if "done" in kinds and answer else 1

    _show("result")
    print("FAILURES:", failures)
    return 0 if failures == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke-test the পাঠ সমাধান API")
    parser.add_argument("--base-url", help="Test a deployed backend instead of the in-process app")
    args = parser.parse_args()

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
