"""
Scraper orchestrator: collects creator content from multiple sources.

Strategy (per platform):
1. Try web scraping first (no auth, no API keys — always works)
2. Fall back to API-based scrapers if available and configured
3. Always search the broader web for mentions and articles
"""
import time
from pathlib import Path


def _try_api_scraper(platform: str, creator: str, output_dir: Path) -> list[Path]:
    """Try the API-based scraper for a platform. Returns [] on failure."""
    try:
        if platform == "TikTok":
            from scrapers.tiktok import scrape
            return scrape(creator, output_dir)
        elif platform == "Instagram":
            from scrapers.instagram import scrape
            return scrape(creator, output_dir)
    except Exception:
        pass
    return []


def _web_scrape(platform: str, creator: str, output_dir: Path) -> list[Path]:
    """Web-scrape a platform's public profile page."""
    try:
        if platform == "TikTok":
            from scrapers.web_scraper import scrape_tiktok_web
            return scrape_tiktok_web(creator, output_dir)
        elif platform == "Instagram":
            from scrapers.web_scraper import scrape_instagram_web
            return scrape_instagram_web(creator, output_dir)
    except Exception:
        pass
    return []


def _scrape_platform(platform: str, creator: str, output_dir: Path) -> list[Path]:
    """Scrape a single platform: web first, API fallback."""
    # Web scraping (no auth needed)
    paths = _web_scrape(platform, creator, output_dir)

    # If web scraping got real content, use it
    if paths:
        # Check the files actually have content (not just error placeholders)
        has_real_content = False
        for p in paths:
            text = p.read_text(encoding="utf-8", errors="ignore")
            if text and not text.startswith("#") and len(text) > 50:
                has_real_content = True
                break
        if has_real_content:
            return paths

    # Fall back to API-based scraper
    api_paths = _try_api_scraper(platform, creator, output_dir)
    if api_paths:
        return api_paths

    return paths  # Return whatever web scraping got, even if thin


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
            now = time.time()
            cutoff = (use_cache_hours or 24) * 3600
            # Only use cache if files have real content (not just error placeholders)
            real_files = [
                f for f in existing_txt
                if not f.read_text(encoding="utf-8", errors="ignore").startswith("#")
                and len(f.read_text(encoding="utf-8", errors="ignore")) > 50
            ]
            if real_files and all((now - f.stat().st_mtime) < cutoff for f in real_files):
                return existing_txt

    paths = []

    # Scrape each platform
    for platform in platforms:
        paths.extend(_scrape_platform(platform, creator_identifier, output_dir))

    # Always do a web presence search (articles, mentions, brand partnerships)
    try:
        from scrapers.web_scraper import scrape_web_presence
        paths.extend(scrape_web_presence(creator_identifier, output_dir))
    except Exception:
        pass

    return paths
