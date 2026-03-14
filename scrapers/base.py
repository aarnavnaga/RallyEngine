"""
Base scraper interface and orchestrator entrypoint.
Scrapers write to output_dir under platform subdirs (e.g. tiktok/, instagram/).
"""
from pathlib import Path


def scrape_tiktok(creator_identifier: str, output_dir: Path) -> list[Path]:
    """Scrape TikTok content for creator. Returns paths to written files."""
    from scrapers.tiktok import scrape as tiktok_scrape
    return tiktok_scrape(creator_identifier, output_dir)


def scrape_instagram(creator_identifier: str, output_dir: Path) -> list[Path]:
    """Scrape Instagram content for creator. Returns paths to written files."""
    from scrapers.instagram import scrape as instagram_scrape
    return instagram_scrape(creator_identifier, output_dir)


def run_scrapers(
    creator_identifier: str,
    platforms: list[str],
    output_dir: Path,
    use_cache_hours: float | None = None,
) -> list[Path]:
    """
    Run scrapers for the given platforms and write to output_dir.
    If use_cache_hours is set and output_dir has recent content, skip scraping.
    Returns list of all written file paths.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Cache-first: skip scrape if we already have content and cache is valid
    existing_txt = list(output_dir.rglob("*.txt"))
    if existing_txt:
        if use_cache_hours is None or use_cache_hours > 0:
            import time
            now = time.time()
            cutoff = (use_cache_hours or 24) * 3600
            if all((now - f.stat().st_mtime) < cutoff for f in existing_txt):
                return existing_txt

    paths = []
    if "TikTok" in platforms:
        paths.extend(scrape_tiktok(creator_identifier, output_dir))
    if "Instagram" in platforms:
        paths.extend(scrape_instagram(creator_identifier, output_dir))

    return paths
