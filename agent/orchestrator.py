"""
Pipeline orchestrator: scrape -> ingest -> retrieve -> LLM summary and brand-fit report.
"""
import os
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


def _call_llm(system: str, user: str, model: str = "gpt-4o-mini") -> str:
    """Single LLM call via OpenAI. Returns assistant message content."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        return f"[LLM error: {e}]"


def _build_context(creator_name: str, brand_context: str | None, k: int = 14) -> str:
    """Retrieve relevant chunks and format as a single context string."""
    queries = [
        "content style tone topics audience",
        "brand partnership collaboration sponsored",
        "skincare makeup beauty routine",
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
    context = _build_context(name, brand_context)

    # 4) Creator summary
    if progress_callback:
        progress_callback("Generating report...")
    sys_sum, user_sum = creator_summary_messages(name, context)
    summary = _call_llm(sys_sum, user_sum)

    # 5) Brand-fit assessment
    sys_fit, user_fit = brand_fit_messages(name, context, brand_context or "")
    brand_fit = _call_llm(sys_fit, user_fit)

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
