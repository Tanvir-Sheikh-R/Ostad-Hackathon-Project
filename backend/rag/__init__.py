"""পাঠ সমাধান RAG pipeline.

Submodules are imported explicitly by callers rather than re-exported here, so a
request that only needs the catalog does not pull in torch and the LLM clients.
"""

__all__ = ["answer", "chapters", "embeddings", "llm", "quiz", "retriever", "summary"]
