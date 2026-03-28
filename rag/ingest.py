"""
Ingest scraped creator content: load from directory, chunk, embed, store in vector DB.
"""
from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .vector_store import get_client, get_collection_name, get_or_create_collection

# Local embedding function using sentence-transformers (free, no API key needed)
def _get_embedding_function():
    from chromadb.utils import embedding_functions
    return embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2",
    )


def get_creator_data_dir(creator_name: str, base_dir: Path | None = None) -> Path:
    """Path to creator's scraped data directory."""
    base = base_dir or Path(__file__).resolve().parent.parent
    normalized = (creator_name or "").strip().lower().lstrip("@")
    normalized = "".join(c if c.isalnum() or c in "._- " else "_" for c in normalized).strip() or "unknown"
    return base / "data" / "creators" / normalized.replace(" ", "_")


def _load_documents(creator_data_dir: Path):
    """Load all text files from creator directory (recursive)."""
    if not creator_data_dir.exists():
        return []
    loader = DirectoryLoader(
        str(creator_data_dir),
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8", "autodetect_encoding": True},
        show_progress=False,
    )
    return loader.load()


def ingest_creator(creator_name: str, creator_data_dir: Path | None = None):
    """
    Ingest a creator's data from disk into the vector store.
    - Loads from data/creators/<normalized_name>/ (or creator_data_dir if provided)
    - Chunks with overlap, embeds with sentence-transformers, stores in Chroma per-creator collection.
    Replaces existing collection for this creator.
    Returns (num_docs_loaded, num_chunks_indexed).
    """
    data_dir = creator_data_dir or get_creator_data_dir(creator_name)
    docs = _load_documents(data_dir)
    if not docs:
        return 0, 0

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)

    client = get_client()
    coll_name = get_collection_name(creator_name)
    try:
        client.delete_collection(name=coll_name)
    except Exception:
        pass
    collection = get_or_create_collection(client, creator_name, _get_embedding_function())

    ids = [f"{coll_name}_{i}" for i in range(len(chunks))]
    texts = [c.page_content for c in chunks]
    metadatas = [{"source": (c.metadata.get("source") or "unknown")[:500]} for c in chunks]

    collection.add(ids=ids, documents=texts, metadatas=metadatas)
    return len(docs), len(chunks)
