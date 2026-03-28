"""
Web-based content scraper: fetches publicly available creator content
without requiring API keys or authentication.

Uses httpx + BeautifulSoup to scrape:
1. Public TikTok profile pages (bio, video descriptions)
2. Public Instagram profile metadata
3. Google search results for broader web presence
"""
import re
import time
from pathlib import Path
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _fetch(url: str, timeout: float = 15.0) -> str | None:
    """Fetch a URL and return the response text, or None on error."""
    try:
        resp = httpx.get(url, headers=_HEADERS, timeout=timeout, follow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except Exception:
        return None


def scrape_tiktok_web(creator: str, output_dir: Path) -> list[Path]:
    """Scrape TikTok profile page for bio and video descriptions."""
    out = output_dir / "tiktok"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    url = f"https://www.tiktok.com/@{handle}"
    html = _fetch(url)

    lines = []
    if html:
        soup = BeautifulSoup(html, "html.parser")

        # Extract bio from meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            lines.append(f"TikTok Bio: {meta_desc['content'].strip()}")

        # Extract from og:description (often has follower counts + bio)
        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc and og_desc.get("content"):
            content = og_desc["content"].strip()
            if content not in [l.replace("TikTok Bio: ", "") for l in lines]:
                lines.append(f"TikTok Profile: {content}")

        # Extract video descriptions from JSON-LD or script tags
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                import json
                data = json.loads(script.string or "")
                if isinstance(data, dict):
                    desc = data.get("description", "")
                    if desc:
                        lines.append(f"Content: {desc.strip()}")
                elif isinstance(data, list):
                    for item in data:
                        desc = item.get("description", "") if isinstance(item, dict) else ""
                        if desc:
                            lines.append(f"Content: {desc.strip()}")
            except Exception:
                pass

        # Extract any visible text that looks like video descriptions
        for tag in soup.find_all(["span", "div"], attrs={"data-e2e": True}):
            text = tag.get_text(strip=True)
            if text and len(text) > 20 and text not in lines:
                lines.append(f"Content: {text}")

    written = []
    if lines:
        # Deduplicate
        seen = set()
        unique = []
        for line in lines:
            if line not in seen:
                seen.add(line)
                unique.append(line)
        path = out / "captions.txt"
        path.write_text("\n\n".join(unique), encoding="utf-8")
        written.append(path)

    return written


def scrape_instagram_web(creator: str, output_dir: Path) -> list[Path]:
    """Scrape Instagram profile page for publicly available metadata."""
    out = output_dir / "instagram"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    url = f"https://www.instagram.com/{handle}/"
    html = _fetch(url)

    lines = []
    if html:
        soup = BeautifulSoup(html, "html.parser")

        # Meta description usually has: "N Followers, N Following, N Posts - bio text"
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            lines.append(f"Instagram Profile: {meta_desc['content'].strip()}")

        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc and og_desc.get("content"):
            content = og_desc["content"].strip()
            if content not in [l.replace("Instagram Profile: ", "") for l in lines]:
                lines.append(f"Instagram Bio: {content}")

        # Extract from JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                import json
                data = json.loads(script.string or "")
                if isinstance(data, dict):
                    desc = data.get("description", "")
                    name = data.get("name", "")
                    alt_name = data.get("alternateName", "")
                    if desc:
                        lines.append(f"Description: {desc.strip()}")
                    if name:
                        lines.append(f"Name: {name.strip()}")
                    if alt_name:
                        lines.append(f"Handle: {alt_name.strip()}")
            except Exception:
                pass

    written = []
    if lines:
        seen = set()
        unique = []
        for line in lines:
            if line not in seen:
                seen.add(line)
                unique.append(line)
        path = out / "captions.txt"
        path.write_text("\n\n".join(unique), encoding="utf-8")
        written.append(path)

    return written


def scrape_web_presence(creator: str, output_dir: Path) -> list[Path]:
    """Search the web for articles, mentions, and content about the creator.

    Uses DuckDuckGo HTML search (no API key needed).
    """
    out = output_dir / "web"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    queries = [
        f'"{handle}" UGC creator',
        f'"{handle}" tiktok OR instagram brand partnership',
        f'@{handle} creator content',
    ]

    all_snippets = []
    for query in queries:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        html = _fetch(url)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")

        # DuckDuckGo HTML results have class "result__snippet"
        for result in soup.find_all("a", class_="result__snippet"):
            text = result.get_text(strip=True)
            if text and len(text) > 30:
                all_snippets.append(text)

        # Also grab result titles
        for result in soup.find_all("a", class_="result__a"):
            text = result.get_text(strip=True)
            if text and len(text) > 10:
                all_snippets.append(f"Mention: {text}")

        time.sleep(1.0)  # Rate limit between searches

    written = []
    if all_snippets:
        seen = set()
        unique = []
        for s in all_snippets:
            if s not in seen:
                seen.add(s)
                unique.append(s)
        path = out / "web_mentions.txt"
        path.write_text("\n\n".join(unique[:50]), encoding="utf-8")
        written.append(path)

    return written
