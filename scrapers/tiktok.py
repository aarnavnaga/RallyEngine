"""
TikTok scraper: fetch user videos and extract captions/descriptions (and subtitles if available).
Writes to output_dir/tiktok/ as .txt files for RAG ingestion.
"""
from pathlib import Path


def scrape(creator_identifier: str, output_dir: Path) -> list[Path]:
    """
    Scrape TikTok content for the given creator (username/handle).
    Writes one or more .txt files under output_dir/tiktok/.
    Returns list of written file paths.
    """
    out = output_dir / "tiktok"
    out.mkdir(parents=True, exist_ok=True)

    written = []
    try:
        from TikTokApi import TikTokApi
        import asyncio

        async def _run():
            async with TikTokApi() as api:
                user = await api.user(creator_identifier)
                if not user:
                    return []
                videos = await user.videos(count=30)
                lines = []
                for i, v in enumerate(videos):
                    desc = (v.as_dict if hasattr(v, "as_dict") else getattr(v, "desc", None)) or ""
                    if isinstance(v, dict):
                        desc = v.get("desc") or v.get("description") or ""
                    lines.append(f"Video {i + 1}: {desc}")
                if lines:
                    path = out / "captions.txt"
                    path.write_text("\n\n".join(lines), encoding="utf-8")
                    return [path]
                return []

        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, _run())
                written = future.result()
        else:
            written = asyncio.run(_run())
    except Exception:
        # Don't write error placeholder — let the web scraper handle it
        pass

    return written
