"""
Web-based content scraper: fetches publicly available creator content
without requiring API keys or authentication.

Data sources (in order of reliability):
1. TikTok oEmbed API — public, returns profile title and author name
2. Brave Search — reliable search engine, no CAPTCHA, rich snippets
3. Reddit/forum discussions — real user opinions about the creator
4. Public profile page metadata — bio, stats from meta tags
"""
import json
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


def _deduplicate(lines: list[str]) -> list[str]:
    """Remove duplicate lines while preserving order."""
    seen = set()
    unique = []
    for line in lines:
        normalized = line.strip().lower()
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique.append(line)
    return unique


_last_search_time = 0.0


def _brave_search(query: str) -> list[str]:
    """Search Brave and return result snippets + titles.

    Enforces a minimum 3-second gap between searches to avoid rate limiting.
    """
    global _last_search_time
    elapsed = time.time() - _last_search_time
    if elapsed < 3.0:
        time.sleep(3.0 - elapsed)

    url = f"https://search.brave.com/search?q={quote_plus(query)}"
    html = _fetch(url)
    _last_search_time = time.time()

    if not html:
        return []

    # Detect rate limiting / CAPTCHA
    if "captcha" in html.lower()[:2000] or "429" in html[:500]:
        time.sleep(5.0)
        return []

    soup = BeautifulSoup(html, "html.parser")
    results = []

    # Brave uses .snippet and .generic-snippet for result containers
    for el in soup.find_all(True, class_=re.compile(r"generic-snippet|description.*svelte")):
        text = el.get_text(strip=True)
        if text and len(text) > 25:
            results.append(text)

    # Also grab result titles
    for el in soup.find_all(True, class_=re.compile(r"title.*snippet")):
        text = el.get_text(strip=True)
        if text and len(text) > 10:
            results.append(f"Result: {text}")

    return results


def scrape_tiktok_web(creator: str, output_dir: Path) -> list[Path]:
    """Scrape TikTok creator data using oEmbed API + Brave search."""
    out = output_dir / "tiktok"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    lines = []

    # 1) TikTok oEmbed API — always works, gives profile name
    try:
        resp = httpx.get(
            f"https://www.tiktok.com/oembed?url=https://www.tiktok.com/@{handle}",
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            title = data.get("title", "")
            author = data.get("author_name", "")
            if title:
                lines.append(f"TikTok Profile: {title}")
            if author:
                lines.append(f"Creator Name: {author}")

            # Parse embedded HTML for any extra links/info
            embed_html = data.get("html", "")
            if embed_html:
                embed_soup = BeautifulSoup(embed_html, "html.parser")
                for a in embed_soup.find_all("a"):
                    text = a.get_text(strip=True)
                    if text and len(text) > 5 and text != f"@{handle}":
                        lines.append(f"Profile link: {text}")
    except Exception:
        pass

    # 2) Brave Search for TikTok content (single consolidated query)
    results = _brave_search(f"{handle} tiktok creator content review")
    for r in results:
        if len(r) > 30:
            lines.append(f"TikTok Content: {r}")

    written = []
    if lines:
        path = out / "captions.txt"
        path.write_text("\n\n".join(_deduplicate(lines)), encoding="utf-8")
        written.append(path)

    return written


def scrape_instagram_web(creator: str, output_dir: Path) -> list[Path]:
    """Scrape Instagram creator data using profile page + Brave search."""
    out = output_dir / "instagram"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    lines = []

    # 1) Public Instagram profile page meta tags
    html = _fetch(f"https://www.instagram.com/{handle}/")
    if html:
        soup = BeautifulSoup(html, "html.parser")

        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            lines.append(f"Instagram Profile: {meta_desc['content'].strip()}")

        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc and og_desc.get("content"):
            content = og_desc["content"].strip()
            lines.append(f"Instagram Bio: {content}")

    # 2) Brave Search for Instagram content (single consolidated query)
    results = _brave_search(f"{handle} instagram creator brand")
    for r in results:
        if len(r) > 30:
            lines.append(f"Instagram Content: {r}")

    written = []
    if lines:
        path = out / "captions.txt"
        path.write_text("\n\n".join(_deduplicate(lines)), encoding="utf-8")
        written.append(path)

    return written


def _scrape_reddit(handle: str, results: list[str]):
    """Scrape Reddit's public JSON API for posts and comments about the creator.

    Reddit exposes .json endpoints for search results — no auth needed.
    """
    reddit_headers = {**_HEADERS, "Accept": "application/json"}
    search_url = (
        f"https://www.reddit.com/search.json"
        f"?q={quote_plus(handle)}&sort=relevance&limit=15"
    )
    try:
        resp = httpx.get(search_url, headers=reddit_headers, timeout=10, follow_redirects=True)
        if resp.status_code != 200:
            return

        data = resp.json()
        posts = data.get("data", {}).get("children", [])

        for post in posts:
            p = post.get("data", {})
            title = p.get("title", "").strip()
            selftext = p.get("selftext", "").strip()
            subreddit = p.get("subreddit", "")
            score = p.get("score", 0)
            num_comments = p.get("num_comments", 0)

            if title and handle.lower() in (title + selftext).lower():
                results.append(
                    f"Reddit r/{subreddit} ({score} upvotes, {num_comments} comments): {title}"
                )
                if selftext and len(selftext) > 20:
                    results.append(f"Reddit post body: {selftext[:500]}")

            # Fetch top comments from the post
            if num_comments > 0 and handle.lower() in (title + selftext).lower():
                permalink = p.get("permalink", "")
                if permalink:
                    _scrape_reddit_comments(permalink, handle, results)
                    time.sleep(1.0)

    except Exception:
        pass


def _scrape_reddit_comments(permalink: str, handle: str, results: list[str]):
    """Fetch top comments from a Reddit post."""
    reddit_headers = {**_HEADERS, "Accept": "application/json"}
    url = f"https://www.reddit.com{permalink}.json?limit=10&sort=top"
    try:
        resp = httpx.get(url, headers=reddit_headers, timeout=10, follow_redirects=True)
        if resp.status_code != 200:
            return

        data = resp.json()
        if not isinstance(data, list) or len(data) < 2:
            return

        comments = data[1].get("data", {}).get("children", [])
        for comment in comments[:10]:
            c = comment.get("data", {})
            body = c.get("body", "").strip()
            score = c.get("score", 0)
            if body and len(body) > 15:
                results.append(f"Reddit comment ({score} upvotes): {body[:400]}")

    except Exception:
        pass


def scrape_web_presence(creator: str, output_dir: Path) -> list[Path]:
    """Search the web for articles, discussions, reviews, and brand mentions.

    Uses Brave Search with targeted queries, then follows top result pages
    for detailed content about the creator.
    """
    out = output_dir / "web"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    # Use only 2 broad queries to avoid rate limiting (TikTok/IG already used 2)
    queries = [
        f'"{handle}" creator review brand partnership',
        f'"{handle}" engagement audience sponsor reddit',
    ]

    all_snippets = []
    result_urls = []

    for query in queries:
        url = f"https://search.brave.com/search?q={quote_plus(query)}"
        html = _fetch(url)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")

        # Extract snippets
        for el in soup.find_all(True, class_=re.compile(r"generic-snippet|description.*svelte")):
            text = el.get_text(strip=True)
            if text and len(text) > 30:
                all_snippets.append(text)

        # Extract titles
        for el in soup.find_all(True, class_=re.compile(r"title.*snippet")):
            text = el.get_text(strip=True)
            if text and len(text) > 10:
                all_snippets.append(f"Mention: {text}")

        # Collect URLs for deep scraping (skip tiktok/instagram — already handled)
        for a in soup.find_all("a", href=True):
            href = a.get("href", "")
            if (
                href.startswith("http")
                and "brave.com" not in href
                and "tiktok.com" not in href
                and "instagram.com" not in href
                and "google.com" not in href
            ):
                result_urls.append(href)

        time.sleep(0.8)

    # Reddit JSON API — public, no auth, great for community sentiment
    _scrape_reddit(handle, all_snippets)

    # Deep scrape top result pages for paragraphs mentioning the creator
    detailed_content = []
    for page_url in result_urls[:5]:
        html = _fetch(page_url, timeout=8.0)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")

        # Remove non-content tags
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # Extract paragraphs and list items mentioning the creator
        for el in soup.find_all(["p", "li", "h2", "h3"]):
            text = el.get_text(strip=True)
            if (
                handle.lower() in text.lower()
                and 40 < len(text) < 800
            ):
                detailed_content.append(text)

        # Also grab comment-like content (Reddit, forums)
        for el in soup.find_all(True, class_=re.compile(
            r"comment|reply|post-text|post-body|md|usertext", re.IGNORECASE
        )):
            text = el.get_text(strip=True)
            if (
                handle.lower() in text.lower()
                and 30 < len(text) < 600
            ):
                detailed_content.append(f"User comment: {text}")

        time.sleep(0.5)

    written = []

    # Main web mentions file
    combined = all_snippets + detailed_content
    if combined:
        path = out / "web_mentions.txt"
        path.write_text(
            "\n\n".join(_deduplicate(combined)[:80]),
            encoding="utf-8",
        )
        written.append(path)

    # Separate engagement data for better RAG retrieval
    engagement_keywords = [
        "engagement", "follower", "views", "likes", "comments",
        "audience", "rate", "growth", "reach", "impression", "subscriber",
    ]
    engagement_snippets = [
        s for s in combined
        if any(kw in s.lower() for kw in engagement_keywords)
    ]
    if engagement_snippets:
        path = out / "engagement_data.txt"
        path.write_text(
            "\n\n".join(_deduplicate(engagement_snippets)[:30]),
            encoding="utf-8",
        )
        written.append(path)

    # Separate brand partnership data
    brand_keywords = [
        "brand", "sponsor", "partner", "ambassador", "collab",
        "#ad", "#sponsored", "#gifted", "campaign", "deal", "promo",
    ]
    brand_snippets = [
        s for s in combined
        if any(kw in s.lower() for kw in brand_keywords)
    ]
    if brand_snippets:
        path = out / "brand_partnerships.txt"
        path.write_text(
            "\n\n".join(_deduplicate(brand_snippets)[:20]),
            encoding="utf-8",
        )
        written.append(path)

    # Separate community sentiment (reviews, opinions)
    sentiment_keywords = [
        "review", "opinion", "think", "worth", "recommend",
        "love", "hate", "overrated", "underrated", "honest",
    ]
    sentiment_snippets = [
        s for s in combined
        if any(kw in s.lower() for kw in sentiment_keywords)
    ]
    if sentiment_snippets:
        path = out / "community_sentiment.txt"
        path.write_text(
            "\n\n".join(_deduplicate(sentiment_snippets)[:20]),
            encoding="utf-8",
        )
        written.append(path)

    return written
