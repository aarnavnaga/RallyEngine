"""
Pipeline orchestrator: scrape -> ingest -> retrieve -> LLM summary and brand-fit report.
"""
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Callable

from dotenv import load_dotenv

load_dotenv()

# RAG
from rag.ingest import get_creator_data_dir, ingest_creator
from rag.retrieve import retrieve

# Prompts
from agent.prompts import brand_fit_messages, creator_summary_messages

# Scrapers (stub until implemented)
from scrapers.base import run_scrapers


def _normalize_creator_name(name: str) -> str:
    s = (name or "").strip()
    return s.lstrip("@") or "unknown"


def _call_llm(
    system: str,
    user: str,
    model: str = "gemma3:4b",
    token_callback: Callable[[str], None] | None = None,
) -> str:
    """Single LLM call via Ollama (local, free). Returns full assistant content.

    If token_callback is provided, streams tokens and fires callback per chunk.
    No length cap — full-quality output.
    """
    try:
        import json as _json
        import httpx
        with httpx.stream(
            "POST",
            "http://localhost:11434/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "stream": True,
            },
            timeout=180.0,
        ) as resp:
            resp.raise_for_status()
            parts: list[str] = []
            for line in resp.iter_lines():
                if not line:
                    continue
                try:
                    obj = _json.loads(line)
                except Exception:
                    continue
                chunk = (obj.get("message") or {}).get("content") or ""
                if chunk:
                    parts.append(chunk)
                    if token_callback:
                        try:
                            token_callback(chunk)
                        except Exception:
                            pass
                if obj.get("done"):
                    break
            return "".join(parts).strip()
    except Exception as e:
        return f"[LLM error: {e}]"


def _build_context(creator_name: str, brand_context: str | None, k: int = 18) -> str:
    """Retrieve relevant chunks and format as a single context string."""
    queries = [
        "follower count followers views likes comments engagement rate metrics",
        "top performing video caption recent post",
        "content style tone topics audience",
        "brand partnership collaboration sponsored ad",
        "bio profile verified platform",
    ]
    if brand_context:
        queries.append(brand_context)
    seen = set()
    parts = []
    for q in queries:
        for item in retrieve(creator_name, q, k=min(6, k)):
            content = (item.get("content") or "").strip()
            if content and content not in seen:
                seen.add(content)
                parts.append(content)
            if len(parts) >= k:
                break
        if len(parts) >= k:
            break
    return "\n\n---\n\n".join(parts[:k]) if parts else ""


def run_analysis(
    creator_name: str,
    platforms: list[str] | None = None,
    brand_context: str | None = None,
    creator_data_dir: Path | None = None,
    use_cache_hours: float | None = None,
    progress_callback: Callable[[str], None] | None = None,
    token_callback: Callable[[str, str], None] | None = None,
) -> dict[str, Any]:
    """
    Run full pipeline: scrape (if needed) -> ingest -> retrieve -> LLM -> report.
    Returns dict with keys: summary, content_analysis, brand_fit, caveats, meta.
    """
    platforms = platforms or ["TikTok", "Instagram"]
    name = _normalize_creator_name(creator_name)
    data_dir = creator_data_dir or get_creator_data_dir(name)

    # 1) Scrape (writes to data_dir); may skip if cache is fresh
    if progress_callback:
        progress_callback("Scraping platforms...")
    run_scrapers(name, list(platforms), data_dir, use_cache_hours=use_cache_hours)

    # 2) Ingest into vector store
    if progress_callback:
        progress_callback("Building RAG index...")
    num_docs, num_chunks = ingest_creator(name, creator_data_dir=data_dir)
    if num_chunks == 0:
        return {
            "summary": "No content found for this creator.",
            "content_analysis": "No posts or captions were available to analyze.",
            "brand_fit": "Cannot assess; no data.",
            "caveats": "Add content under data/creators/<name>/ or run scrapers for TikTok/Instagram.",
            "meta": {"num_docs": 0, "num_chunks": 0},
        }

    # 3) Build context from RAG
    if progress_callback:
        progress_callback("Searching relevant context...")
    context = _build_context(name, brand_context)

    # 4) Run summary + brand-fit LLM calls in parallel with token streaming.
    # Note: Ollama on single-GPU Macs effectively serializes these calls,
    # so wall-clock gain is minimal, but the code is correct and will benefit
    # from OLLAMA_NUM_PARALLEL>1 on capable hardware.
    if progress_callback:
        progress_callback("Generating report (streaming)...")
    sys_sum, user_sum = creator_summary_messages(name, context)
    sys_fit, user_fit = brand_fit_messages(name, context, brand_context or "")

    def _stream_summary(chunk: str) -> None:
        if token_callback:
            token_callback("summary", chunk)

    def _stream_fit(chunk: str) -> None:
        if token_callback:
            token_callback("brand_fit", chunk)

    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_summary = pool.submit(_call_llm, sys_sum, user_sum, "gemma3:4b", _stream_summary)
        fut_fit = pool.submit(_call_llm, sys_fit, user_fit, "gemma3:4b", _stream_fit)
        summary = fut_summary.result()
        brand_fit = fut_fit.result()

    # Parse caveats from summary (last line often "Limitations: ...") or from brand_fit
    caveats = "Based on retrieved excerpts only; no demographic or reach data."
    if "Limitation" in summary or "limitation" in summary.lower():
        for line in summary.split("\n")[-3:]:
            if "limitation" in line.lower() or "based on" in line.lower():
                caveats = line.strip()
                break

    return {
        "summary": summary,
        "content_analysis": summary,
        "brand_fit": brand_fit,
        "caveats": caveats,
        "meta": {"num_docs": num_docs, "num_chunks": num_chunks},
    }
