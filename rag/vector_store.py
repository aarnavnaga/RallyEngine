"""
Vector store wrapper using Chroma with per-creator collections.
"""
from pathlib import Path

import chromadb
from chromadb.config import Settings


def _normalize_creator_name(name: str) -> str:
    """Normalize creator name for use as collection id (alphanumeric + underscore)."""
    s = (name or "").strip().lower()
    s = s.lstrip("@")
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in s) or "unknown"


def get_chroma_persist_dir() -> Path:
    """Directory for persisting Chroma DB."""
    base = Path(__file__).resolve().parent.parent
    persist_dir = base / "data" / "vectors"
    persist_dir.mkdir(parents=True, exist_ok=True)
    return persist_dir


def get_client(persist_directory: Path | None = None):
    """Get a Chroma client with optional persistence."""
    persist = persist_directory or get_chroma_persist_dir()
    return chromadb.PersistentClient(
        path=str(persist),
        settings=Settings(anonymized_telemetry=False),
    )


def get_collection_name(creator_name: str) -> str:
    """Collection name for a creator (safe for Chroma)."""
    normalized = _normalize_creator_name(creator_name)
    return f"creator_{normalized}"


def get_or_create_collection(client, creator_name: str, embedding_function):
    """Get or create a Chroma collection for the given creator."""
    name = get_collection_name(creator_name)
    return client.get_or_create_collection(
        name=name,
        embedding_function=embedding_function,
        metadata={"creator": creator_name},
    )
