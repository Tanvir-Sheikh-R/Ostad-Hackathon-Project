"""chapters.json access: the page → chapter index, plus the UI chapter tree.

The published artifact keeps everything under a single "all_books" key:

    all_books.class_5..class_8 : {subject: [chapter, ...]}
    all_books.class_9_10       : {stream: {subject: [chapter, ...]}}

A chapter carries chapter_number, chapter_name, starting_page and an optional
sub_chapters list whose entries carry sub_chapter_name, writer_name and starting_page.

Every path elsewhere in the app names a book as "class_id/book", so this module owns
the single implementation of that lookup plus the book path spoken by embedding_cache.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

from backend.config import CATALOG_CLASSES, CHAPTERS_INDEX, EMBEDDING_CACHE

CLASS_ORDER = ("class_5", "class_6", "class_7", "class_8", "class_9_10")

CLASS_LABELS = {
    "class_5": "৫ম শ্রেণি",
    "class_6": "৬ষ্ঠ শ্রেণি",
    "class_7": "৭ম শ্রেণি",
    "class_8": "৮ম শ্রেণি",
    "class_9_10": "৯ম-১০ম শ্রেণি",
}

# English labels ride alongside the Bangla ones (not instead of them): the catalog ships
# both and the client picks by its selected language.
CLASS_LABELS_EN = {
    "class_5": "Class 5",
    "class_6": "Class 6",
    "class_7": "Class 7",
    "class_8": "Class 8",
    "class_9_10": "Class 9-10 (SSC)",
}

STREAM_LABELS = {
    "general": "সাধারণ",
    "arts": "মানবিক",
    "commerce": "ব্যবসায় শিক্ষা",
    "science": "বিজ্ঞান",
}

STREAM_LABELS_EN = {
    "general": "General",
    "arts": "Arts",
    "commerce": "Commerce",
    "science": "Science",
}

SUBJECT_LABELS = {
    "bangla": "বাংলা",
    "bangla_bekoron": "বাংলা ব্যাকরণ",
    "bangla_bakoron": "বাংলা ব্যাকরণ",
    "bangla_grammar": "বাংলা ব্যাকরণ",
    "bangla_sahitto": "বাংলা সাহিত্য",
    "bangla_sohopath": "বাংলা সহপাঠ",
    "charupath": "চারুপাঠ",
    "anandopah": "আনন্দপাঠ",
    "anandapatha": "আনন্দপাঠ",
    "anondopath": "আনন্দপাঠ",
    "sahitto_konika": "সাহিত্য কণিকা",
    "english": "ইংরেজি",
    "english_grammar": "ইংরেজি ব্যাকরণ",
    "english_gerammar": "ইংরেজি ব্যাকরণ",
    "mathematics": "গণিত",
    "math": "গণিত",
    "higher_math": "উচ্চতর গণিত",
    "science": "বিজ্ঞান",
    "physics": "পদার্থবিজ্ঞান",
    "chemistry": "রসায়ন",
    "biology": "জীববিজ্ঞান",
    "bgs": "বাংলাদেশ ও বিশ্বপরিচয়",
    "history": "ইতিহাস",
    "bhugol": "ভূগোল",
    "civics": "পৌরনীতি ও নাগরিকতা",
    "economics": "অর্থনীতি",
    "accounting": "হিসাববিজ্ঞান",
    "business_entrepreneurship": "ব্যবসায় উদ্যোগ",
    "finance_banking": "ফিন্যান্স ও ব্যাংকিং",
    "agriculture": "কৃষিশিক্ষা",
    "krishi": "কৃষিশিক্ষা",
    "home_science": "গৃহবিজ্ঞান",
    "ict": "তথ্য ও যোগাযোগ প্রযুক্তি",
    "career": "কর্মমুখী শিক্ষা",
    "kormo_o_jibon": "কর্ম ও জীবনমুখী শিক্ষা",
    "kormo_o_jibonmukhi_sikkha": "কর্ম ও জীবনমুখী শিক্ষা",
    "physical_education": "শারীরিক শিক্ষা",
    "sharirik_sikha": "শারীরিক শিক্ষা",
    "songit": "সংগীত",
    "songeet": "সংগীত",
    "songgit": "সংগীত",
    "arts_crafts": "চারু ও কারুকলা",
    "art_craft": "চারু ও কারুকলা",
    "songskrito": "সংস্কৃত",
}

SUBJECT_LABELS_EN = {
    "bangla": "Bangla",
    "bangla_bekoron": "Bangla Grammar",
    "bangla_bakoron": "Bangla Grammar",
    "bangla_grammar": "Bangla Grammar",
    "bangla_sahitto": "Bangla Literature",
    "bangla_sohopath": "Bangla Supplementary",
    "charupath": "Charupath",
    "anandopah": "Anandapath",
    "anandapatha": "Anandapath",
    "anondopath": "Anandapath",
    "sahitto_konika": "Sahitya Konika",
    "english": "English",
    "english_grammar": "English Grammar",
    "english_gerammar": "English Grammar",
    "mathematics": "Mathematics",
    "math": "Mathematics",
    "higher_math": "Higher Mathematics",
    "science": "Science",
    "physics": "Physics",
    "chemistry": "Chemistry",
    "biology": "Biology",
    "bgs": "Bangladesh & Global Studies",
    "history": "History",
    "bhugol": "Geography",
    "civics": "Civics & Citizenship",
    "economics": "Economics",
    "accounting": "Accounting",
    "business_entrepreneurship": "Business Entrepreneurship",
    "finance_banking": "Finance & Banking",
    "agriculture": "Agriculture Studies",
    "krishi": "Agriculture Studies",
    "home_science": "Home Science",
    "ict": "ICT",
    "career": "Career Education",
    "kormo_o_jibon": "Work & Life-Oriented Education",
    "kormo_o_jibonmukhi_sikkha": "Work & Life-Oriented Education",
    "physical_education": "Physical Education",
    "sharirik_sikha": "Physical Education",
    "songit": "Music",
    "songeet": "Music",
    "songgit": "Music",
    "arts_crafts": "Arts & Crafts",
    "art_craft": "Arts & Crafts",
    "songskrito": "Sanskrit",
}

_UNKNOWN_CHAPTER = "শিরোনামহীন"


@lru_cache(maxsize=1)
def load_index() -> dict[str, Any]:
    with CHAPTERS_INDEX.open(encoding="utf-8") as handle:
        return json.load(handle)["all_books"]


def known_classes() -> list[str]:
    index = load_index()
    ordered = [cls for cls in CLASS_ORDER if cls in index]
    return ordered + sorted(set(index) - set(ordered))


@lru_cache(maxsize=64)
def streams_of(class_id: str) -> tuple[str, ...]:
    """Streams for a class, or () when subjects sit directly under the class."""
    node = load_index().get(class_id) or {}
    return tuple(key for key, value in node.items() if isinstance(value, dict))


@lru_cache(maxsize=64)
def subjects_of(class_id: str, stream: str | None = None) -> tuple[str, ...]:
    node = load_index().get(class_id) or {}
    if stream:
        return tuple((node.get(stream) or {}).keys())
    return tuple(key for key, value in node.items() if isinstance(value, list))


def resolve_scope(class_id: str, stream: str | None, subject: str) -> dict[str, Any] | None:
    """Return the chapter list for a (class, stream, subject), or None if unknown."""
    node = load_index().get(class_id)
    if not isinstance(node, dict):
        return None

    if stream:
        target = (node.get(stream) or {}).get(subject)
        if isinstance(target, list):
            return {"stream": stream, "subject": subject, "chapters": target}
        return None

    target = node.get(subject)
    if isinstance(target, list):
        return {"stream": None, "subject": subject, "chapters": target}

    # No stream was given, but this class nests subjects under streams: search them.
    for stream_key, stream_node in node.items():
        if isinstance(stream_node, dict) and isinstance(stream_node.get(subject), list):
            return {"stream": stream_key, "subject": subject, "chapters": stream_node[subject]}
    return None


def chapters_of(class_id: str, stream: str | None, subject: str) -> list[dict[str, Any]]:
    scope = resolve_scope(class_id, stream, subject)
    return list(scope["chapters"]) if scope else []


def subject_label(subject: str) -> str:
    if subject in SUBJECT_LABELS:
        return SUBJECT_LABELS[subject]
    # class_9_10 keys are flattened "stream_subject" (e.g. arts_history): label both parts.
    for stream, stream_label in STREAM_LABELS.items():
        if subject.startswith(stream + "_"):
            bare = subject[len(stream) + 1 :]
            return f"{stream_label} · {SUBJECT_LABELS.get(bare, bare.replace('_', ' ').title())}"
    return subject.replace("_", " ").strip().title()


def class_label(class_id: str) -> str:
    return CLASS_LABELS.get(class_id, class_id.replace("_", " ").title())


def subject_label_en(subject: str) -> str:
    """English label for a subject key, including the stream-prefixed class_9_10 keys."""
    if subject in SUBJECT_LABELS_EN:
        return SUBJECT_LABELS_EN[subject]
    for stream, stream_label in STREAM_LABELS_EN.items():
        if subject.startswith(stream + "_"):
            bare = subject[len(stream) + 1 :]
            return f"{stream_label} · {SUBJECT_LABELS_EN.get(bare, bare.replace('_', ' ').title())}"
    return subject.replace("_", " ").strip().title()


def class_label_en(class_id: str) -> str:
    return CLASS_LABELS_EN.get(class_id, class_id.replace("_", " ").title())


def book_path(class_id: str, subject: str, stream: str | None = None) -> str:
    """The path key used by embedding_cache directories.

    class_9_10 is laid out flat on disk: its PDFs are pdf/Class_9_10/General_English.pdf
    and its cache dirs are embedding_cache/class_9_10/general_english/, so stream and
    subject are joined with an underscore (matching the notebook's class_number/book_name
    convention). Every other class is just class_id/subject.
    """
    if stream:
        return f"{class_id}/{stream}_{subject}"
    return f"{class_id}/{subject}"


def normalize_name(name: str) -> str:
    """Unicode-normalise and collapse whitespace so names compare reliably."""
    normalized = unicodedata.normalize("NFC", name)
    return re.sub(r"\s+", " ", normalized).strip()


def normalize_chapter_ref(chapter: str) -> str:
    """Strip a leading "1. " / "১. " numbering prefix and normalise Unicode.

    The UI passes chapter labels like "1. বৈচিত্র্যময় বাংলাদেশ" while the index and
    cache dirs use the bare name; both should resolve to the same chapter.
    """
    name = normalize_name(chapter)
    stripped = re.sub(r"^\s*(?:[\d০-৯]+)\s*[.)\-]?\s*", "", name)
    return stripped or name


def chapter_dir_name(chapter: str) -> str:
    """Windows-safe directory name, matching the notebook's sanitiser."""
    cleaned = "".join("_" if char in '<>:"/\\|?*' else char for char in normalize_name(chapter))
    return cleaned.strip().rstrip(".") or _UNKNOWN_CHAPTER


def _loose(name: str) -> str:
    """Fold away whitespace, underscores, case and composing forms for matching."""
    normalized = unicodedata.normalize("NFD", name).lower()
    return re.sub(r"[\s_\-]+", "", normalized)


def _chapter_hash(chapter: str) -> str:
    """The notebook's hashed cache key: md5(bare chapter name)[:10]."""
    return hashlib.md5(normalize_chapter_ref(chapter).encode("utf-8")).hexdigest()[:10]


def book_directory(book: str) -> Path | None:
    """Resolve a "class_id/subject" book path to its cache directory.

    The index and the disk disagree on a few names (chapters.json names
    commerce_finance_banking while the cache folder is commerce_finance_ banking),
    so an exact miss is retried with separators and spaces folded away. Without this
    the picker marks an indexed book as missing and retrieval reports no vectors.
    """
    exact = EMBEDDING_CACHE.joinpath(*book.split("/"))
    if exact.is_dir():
        return exact

    parts = book.split("/")
    if not parts:
        return None
    parent = EMBEDDING_CACHE.joinpath(*parts[:-1]) if len(parts) > 1 else EMBEDDING_CACHE
    if not parent.is_dir():
        return None

    wanted = _loose(parts[-1])
    for child in parent.iterdir():
        if child.is_dir() and _loose(child.name) == wanted:
            return child
    return None


def book_has_vectors(book: str) -> bool:
    """True when a book's cache dir holds at least one embedded chapter."""
    directory = book_directory(book)
    if directory is None:
        return False
    return any(
        (child / "vectors.npy").exists() or (child / "index.faiss").exists()
        for child in directory.iterdir()
        if child.is_dir()
    )


def cached_book_paths() -> set[str]:
    """Every class/book (or class/stream/book) path that has embedded chapters."""
    return {book for book in all_book_paths() if book_has_vectors(book)}


def all_book_paths() -> list[str]:
    """Every book path named by the index, whether or not it has cached vectors."""
    paths: list[str] = []
    for class_id in known_classes():
        streams = streams_of(class_id)
        if streams:
            for stream in streams:
                paths.extend(
                    book_path(class_id, subject, stream)
                    for subject in subjects_of(class_id, stream)
                )
        else:
            paths.extend(book_path(class_id, subject) for subject in subjects_of(class_id))
    return paths


def cached_chapter_dirs(book: str) -> set[str]:
    """Chapter cache dir names for a book (hashed dirs preferred, old names included)."""
    directory = book_directory(book)
    if directory is None:
        return set()
    found: set[str] = set()
    for child in directory.iterdir():
        if not child.is_dir():
            continue
        if (child / "vectors.npy").exists() or (child / "index.faiss").exists():
            found.add(child.name)
    return found


@lru_cache(maxsize=4096)
def find_chapter_dir(book: str, chapter: str) -> Path | None:
    """Locate a chapter's cache dir in either the hashed or legacy layout.

    The notebook now stores chapters as md5(name)[:10] folders holding FAISS
    index.faiss/index.pkl, with chapter_name.txt as the sidecar that maps back to the
    real name. Legacy long-name folders holding vectors.npy are still read as fallback.
    """
    directory = book_directory(book)
    if directory is None:
        return None

    bare = normalize_chapter_ref(chapter)

    # 1) Hashed folder, exact key the notebook uses.
    hashed = directory / _chapter_hash(bare)
    if (hashed / "index.faiss").exists():
        return hashed

    # 2) Hashed folder by chapter_name.txt sidecar (tolerates prefix drift).
    for child in directory.iterdir():
        sidecar = child / "chapter_name.txt"
        if (child / "index.faiss").exists() and sidecar.exists():
            if normalize_chapter_ref(sidecar.read_text(encoding="utf-8")) == bare:
                return child

    # 3) Legacy long-name folders (vectors.npy).
    wanted = chapter_dir_name(bare)
    candidates = [
        directory / wanted,
        directory / normalize_name(bare),
        directory / wanted.replace("_", " "),
        directory / wanted.replace(" ", "_"),
    ]
    for candidate in candidates:
        if (candidate / "vectors.npy").exists():
            return candidate

    squashed = _loose(wanted)
    for child in directory.iterdir():
        if _loose(child.name) == squashed and (child / "vectors.npy").exists():
            return child
    return None


def chapter_label(chapter: dict[str, Any]) -> str:
    name = str(chapter.get("chapter_name") or "").strip() or _UNKNOWN_CHAPTER
    number = chapter.get("chapter_number")
    return f"{number}. {name}" if number else name


def catalog_classes(classes: tuple[str, ...] | None = None) -> tuple[str, ...]:
    """The classes the picker offers (CATALOG_CLASSES), falling back to everything."""
    wanted = classes if classes is not None else CATALOG_CLASSES
    known = known_classes()
    if not wanted:
        return tuple(known)
    selected = [class_id for class_id in known if class_id in wanted]
    return tuple(selected or known)


@lru_cache(maxsize=4)
def build_tree(classes: tuple[str, ...] | None = None) -> list[dict[str, Any]]:
    """Class → subjects → chapters, for the selection modal.

    The vector store is keyed by sub-chapter name where a chapter has sub_chapters, so
    sub-chapters are flattened into the chapter list (each carries its parent name).
    """
    tree: list[dict[str, Any]] = []
    cached = cached_book_paths()

    def chapter_entries(chapters: list[dict[str, Any]]) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []
        for chapter in chapters:
            subs = chapter.get("sub_chapters") or []
            if subs:
                for sub in subs:
                    entries.append(
                        {
                            "name": str(sub.get("sub_chapter_name") or _UNKNOWN_CHAPTER),
                            "chapter_name": str(sub.get("sub_chapter_name") or _UNKNOWN_CHAPTER),
                            "number": sub.get("sub_chapter_number"),
                            "starting_page": sub.get("starting_page"),
                            "sub_chapters": [],
                            "parent": str(chapter.get("chapter_name") or _UNKNOWN_CHAPTER),
                            "writer_name": sub.get("writer_name"),
                        }
                    )
            else:
                entries.append(
                    {
                        "name": str(chapter.get("chapter_name") or _UNKNOWN_CHAPTER),
                        "chapter_name": str(chapter.get("chapter_name") or _UNKNOWN_CHAPTER),
                        "number": chapter.get("chapter_number"),
                        "starting_page": chapter.get("starting_page"),
                        "sub_chapters": [],
                        "parent": None,
                        "writer_name": None,
                    }
                )
        return entries

    for class_id in catalog_classes(classes):
        streams = streams_of(class_id)
        subjects: list[dict[str, Any]] = []

        def add_subject(subject: str, stream: str | None) -> None:
            chapters = chapters_of(class_id, stream, subject)
            if not chapters:
                return
            book = book_path(class_id, subject, stream)
            entries = chapter_entries(chapters)
            # Mark which chapters actually have vectors, so the picker can label the
            # rest instead of letting a student pick one and hit an error later.
            for entry in entries:
                entry["indexed"] = find_chapter_dir(book, entry["name"]) is not None
            subjects.append(
                {
                    "subject": subject,
                    "stream": stream,
                    "label": subject_label(subject),
                    "label_en": subject_label_en(subject),
                    "book": book,
                    "indexed": book in cached,
                    "chapters": entries,
                }
            )

        if streams:
            for stream in streams:
                for subject in subjects_of(class_id, stream):
                    add_subject(subject, stream)
        else:
            for subject in subjects_of(class_id):
                add_subject(subject, None)

        if subjects:
            tree.append(
                {
                    "class_id": class_id,
                    "label": class_label(class_id),
                    "label_en": class_label_en(class_id),
                    "nested": bool(streams),
                    "subjects": subjects,
                }
            )
    return tree


def catalog_counts(tree: list[dict[str, Any]]) -> dict[str, int]:
    """Totals for the picker footer and the health endpoint."""
    subjects = [subject for node in tree for subject in node["subjects"]]
    chapters = [chapter for subject in subjects for chapter in subject["chapters"]]
    return {
        "classes": len(tree),
        "subjects": len(subjects),
        "chapters": len(chapters),
        "indexed_books": sum(1 for subject in subjects if subject["indexed"]),
        "indexed_chapters": sum(1 for chapter in chapters if chapter.get("indexed")),
    }


def catalog(classes: tuple[str, ...] | None = None) -> dict[str, Any]:
    """Everything the chapter picker needs in one payload."""
    tree = build_tree(classes)
    return {"classes": tree, "counts": catalog_counts(tree)}


@lru_cache(maxsize=64)
def lookup_book(book: str) -> dict[str, Any] | None:
    """Resolve a book path back to its class/subject/labels.

    The API receives a book path from the client and must not trust the accompanying
    labels, so titles and the chapter list are re-derived from chapters.json here.
    """
    for node in build_tree():
        for subject in node["subjects"]:
            if subject["book"] == book:
                return {
                    "class_id": node["class_id"],
                    "class_label": node["label"],
                    "class_label_en": node["label_en"],
                    "subject": subject["subject"],
                    "subject_label": subject["label"],
                    "subject_label_en": subject["label_en"],
                    "stream": subject["stream"],
                    "book": subject["book"],
                    "chapters": subject["chapters"],
                }
    return None
