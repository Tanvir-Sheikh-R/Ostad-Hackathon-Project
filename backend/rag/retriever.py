"""Hybrid BM25 + dense retrieval over a single chapter's cached embeddings.

Follows the retrieval cell of pipeline/pdf_to_document_cleanV2.ipynb: each chapter
folder holds a FAISS index (index.faiss/index.pkl) plus its chunks (chunks.json), so
nothing is re-embedded at query time. BM25 is rebuilt from chunks.json here because
the notebook pickles its own in-notebook tokenizer object, which is not importable
outside that module. Legacy long-name folders with vectors.npy are still supported.

`search()` is the retrieval entry point used by the chat tab. `chapter_chunks()` and
`sample_chunks()` expose the same cached chunk set so the quiz can turn a chapter into
exam material without a second loader.
"""

from __future__ import annotations

import json
import re
import threading
from functools import lru_cache
from pathlib import Path
from typing import Any

from langchain_community.retrievers import BM25Retriever
from langchain_community.vectorstores import FAISS
from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from backend.config import HYBRID_K, HYBRID_WEIGHTS
from backend.rag.chapters import find_chapter_dir
from backend.rag.embeddings import encode_query

_build_lock = threading.Lock()

_BANGLA_PUNCTUATION = re.compile(r"[।,;:!?\"'()\[\]{}\-—–“”‘’]")

CACHE_SIZE = 32


class ChapterNotIndexed(FileNotFoundError):
    """No cached embeddings exist for the requested book/chapter."""


class E5QueryEmbeddings(Embeddings):
    """Query-side embeddings for FAISS.

    The dense index is loaded from disk, so only query embedding is needed; FAISS also
    probes its embedding callable directly, hence __call__.
    """

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError("The dense index is loaded from the cached FAISS store.")

    def embed_query(self, text: str) -> list[float]:
        return encode_query(text).tolist()

    def __call__(self, text: str) -> list[float]:
        return self.embed_query(text)


def _bn_tokenize(text: str) -> list[str]:
    return _BANGLA_PUNCTUATION.sub(" ", text).split()


def _chapter_dir(book: str, chapter: str) -> Path:
    directory = find_chapter_dir(book, chapter)
    if directory is None:
        raise ChapterNotIndexed(f"No cached embeddings for {book} / {chapter}")
    return directory


def _load_documents(directory: Path) -> list[Document]:
    """Reconstruct LangChain documents from a cache folder's chunks.json."""
    chunks = json.loads((directory / "chunks.json").read_text(encoding="utf-8"))
    return [
        Document(page_content=item["text"], metadata=item.get("meta") or {}) for item in chunks
    ]


@lru_cache(maxsize=CACHE_SIZE)
def _cached_documents(key: str) -> tuple[Document, ...]:
    return tuple(_load_documents(Path(key)))


def chapter_documents(book: str, chapter: str) -> tuple[Document, ...]:
    """Every chunk of one chapter, loaded once per (book, chapter) and cached."""
    return _cached_documents(str(_chapter_dir(book, chapter)))


def chapter_chunks(book: str, chapter: str) -> list[dict[str, Any]]:
    """The chapter's chunks as plain dicts (text + metadata), for prompt building."""
    return [
        {"text": document.page_content, **document.metadata}
        for document in chapter_documents(book, chapter)
    ]


def sample_chunks(book: str, chapter: str, limit: int) -> list[dict[str, Any]]:
    """Evenly spread `limit` chunks across the chapter.

    Taking the first N would sample only the opening pages, so a quiz generated from
    it would ignore the rest of the chapter; striding across the whole file keeps the
    exam representative.
    """
    chunks = chapter_chunks(book, chapter)
    if limit <= 0 or len(chunks) <= limit:
        return chunks
    step = len(chunks) / limit
    return [chunks[int(index * step)] for index in range(limit)]


def _load_dense(directory: Path, documents: tuple[Document, ...]):
    """Load the dense retriever: FAISS index from disk, else rebuild from vectors.npy."""
    if (directory / "index.faiss").exists():
        vectorstore = FAISS.load_local(
            str(directory), E5QueryEmbeddings(), allow_dangerous_deserialization=True
        )
    elif (directory / "vectors.npy").exists():
        import numpy as np

        vectors = np.load(directory / "vectors.npy")
        vectorstore = FAISS.from_embeddings(
            text_embeddings=list(zip([doc.page_content for doc in documents], vectors)),
            embedding=E5QueryEmbeddings(),
            metadatas=[doc.metadata for doc in documents],
        )
    else:
        raise ChapterNotIndexed(f"No FAISS index or vectors in {directory}")
    return vectorstore.as_retriever(search_kwargs={"k": HYBRID_K})


@lru_cache(maxsize=CACHE_SIZE)
def _build_cached(key: str) -> EnsembleRetriever:
    directory = Path(key)
    documents = _cached_documents(key)

    dense = _load_dense(directory, documents)

    bm25 = BM25Retriever.from_documents(list(documents), preprocess_func=_bn_tokenize)
    bm25.k = HYBRID_K

    return EnsembleRetriever(retrievers=[bm25, dense], weights=list(HYBRID_WEIGHTS))


def get_retriever(book: str, chapter: str) -> EnsembleRetriever:
    key = str(_chapter_dir(book, chapter))
    with _build_lock:
        return _build_cached(key)


def search(book: str, chapter: str, query: str, k: int = HYBRID_K) -> list[dict[str, Any]]:
    """Hybrid search limited to one chapter's chunks."""
    documents = get_retriever(book, chapter).invoke(query)[:k]
    hits: list[dict[str, Any]] = []
    for document in documents:
        metadata = document.metadata
        hits.append(
            {
                "text": document.page_content,
                "chapter": metadata.get("chapter"),
                "part": metadata.get("part"),
                "writer_name": metadata.get("writer_name"),
                "page_start": metadata.get("page_start"),
                "page_end": metadata.get("page_end"),
            }
        )
    return hits


def is_indexed(book: str, chapter: str) -> bool:
    """Whether a chapter has cached vectors, without building a retriever."""
    return find_chapter_dir(book, chapter) is not None
