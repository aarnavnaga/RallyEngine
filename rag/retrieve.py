"""
Retrieve relevant chunks from the vector store for a creator (and optional brand context).
"""
from .vector_store import get_client, get_collection_name


def retrieve(
    creator_name: str,
    query: str,
    k: int = 12,
):
    """
    Retrieve top-k chunks for a query in the creator's collection.
    Uses the collection's embedding function to embed the query.
    Returns list of {"content": str, "metadata": dict}.
    """
    client = get_client()
    coll_name = get_collection_name(creator_name)
    try:
        collection = client.get_collection(name=coll_name)
    except Exception:
        return []

    # Collection has an embedding function; query with raw query text
    results = collection.query(query_texts=[query], n_results=min(k, 50))
    if not results or not results.get("documents"):
        return []

    out = []
    docs = results["documents"][0]
    metadatas = (results.get("metadatas") or [None])[0] or [{}] * len(docs)
    for d, m in zip(docs, metadatas):
        out.append({"content": d, "metadata": m})
    return out
