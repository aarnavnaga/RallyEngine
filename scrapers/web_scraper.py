"""
Web-based content scraper: fetches publicly available creator content
without requiring API keys or authentication.

Uses httpx + BeautifulSoup to scrape:
1. Public TikTok profile pages (bio, video descriptions, engagement stats)
2. Public Instagram profile metadata (bio, follower counts, post counts)
3. DuckDuckGo search for broader web presence (articles, brand mentions, reviews)
4. Comment sentiment and engagement patterns from public pages
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


def _extract_numbers(text: str) -> dict[str, str]:
    """Extract follower/following/likes counts from text like '1.2M Followers'."""
    stats = {}
    patterns = [
        (r"([\d,.]+[KMB]?)\s*(?:Followers|followers)", "followers"),
        (r"([\d,.]+[KMB]?)\s*(?:Following|following)", "following"),
        (r"([\d,.]+[KMB]?)\s*(?:Likes|likes|Hearts|hearts)", "likes"),
        (r"([\d,.]+[KMB]?)\s*(?:Posts|posts|Videos|videos)", "posts"),
    ]
    for pattern, key in patterns:
        match = re.search(pattern, text)
        if match:
            stats[key] = match.group(1)
    return stats


def _deduplicate(lines: list[str]) -> list[str]:
    """Remove duplicate lines while preserving order."""
    seen = set()
    unique = []
    for line in lines:
        if line not in seen:
            seen.add(line)
            unique.append(line)
    return unique


def _extract_json_data(soup: BeautifulSoup) -> list[dict]:
    """Extract all JSON-LD and embedded JSON data from a page."""
    data_blocks = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                data_blocks.append(data)
            elif isinstance(data, list):
                data_blocks.extend(d for d in data if isinstance(d, dict))
        except Exception:
            pass
    return data_blocks


def scrape_tiktok_web(creator: str, output_dir: Path) -> list[Path]:
    """Scrape TikTok profile page for bio, video descriptions, and engagement."""
    out = output_dir / "tiktok"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    url = f"https://www.tiktok.com/@{handle}"
    html = _fetch(url)

    lines = []
    engagement_lines = []

    if html:
        soup = BeautifulSoup(html, "html.parser")

        # -- Profile metadata from meta tags --
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            content = meta_desc["content"].strip()
            lines.append(f"TikTok Bio: {content}")
            stats = _extract_numbers(content)
            if stats:
                engagement_lines.append(
                    f"TikTok Stats: {', '.join(f'{v} {k}' for k, v in stats.items())}"
                )

        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc and og_desc.get("content"):
            content = og_desc["content"].strip()
            lines.append(f"TikTok Profile: {content}")
            stats = _extract_numbers(content)
            if stats and not engagement_lines:
                engagement_lines.append(
                    f"TikTok Stats: {', '.join(f'{v} {k}' for k, v in stats.items())}"
                )

        # -- Video data from JSON-LD (descriptions, view counts, comments) --
        for data in _extract_json_data(soup):
            desc = data.get("description", "")
            if desc:
                lines.append(f"Video: {desc.strip()}")

            # Extract engagement from interactionStatistic
            for stat in data.get("interactionStatistic", []):
                if isinstance(stat, dict):
                    stat_type = stat.get("interactionType", "")
                    count = stat.get("userInteractionCount", "")
                    if stat_type and count:
                        type_name = stat_type.replace("http://schema.org/", "")
                        engagement_lines.append(f"Engagement: {type_name} = {count}")

            # Extract comments if present
            for comment in data.get("comment", []):
                if isinstance(comment, dict):
                    text = comment.get("text", "").strip()
                    if text and len(text) > 5:
                        lines.append(f"Comment: {text}")

        # -- Embedded SIGI_STATE or WEBAPP_DATA (TikTok's hydration data) --
        for script in soup.find_all("script", id=re.compile(r"SIGI_STATE|__UNIVERSAL_DATA")):
            try:
                data = json.loads(script.string or "")
                _extract_tiktok_hydration(data, lines, engagement_lines)
            except Exception:
                pass

        # Also try script tags containing window.__INIT_PROPS__ or similar
        for script in soup.find_all("script"):
            text = script.string or ""
            if "videoData" in text or "ItemModule" in text or "UserModule" in text:
                # Try to extract JSON from assignment patterns
                for match in re.finditer(r'=\s*(\{.+?\})\s*;', text, re.DOTALL):
                    try:
                        data = json.loads(match.group(1))
                        _extract_tiktok_hydration(data, lines, engagement_lines)
                    except Exception:
                        pass

        # -- Visible page text for captions and hashtags --
        for tag in soup.find_all(["span", "div"], attrs={"data-e2e": True}):
            text = tag.get_text(strip=True)
            if text and len(text) > 15:
                lines.append(f"Content: {text}")

        # -- Extract hashtags --
        hashtags = set()
        for tag in soup.find_all("a", href=re.compile(r"/tag/")):
            ht = tag.get_text(strip=True)
            if ht.startswith("#"):
                hashtags.add(ht)
        if hashtags:
            lines.append(f"Hashtags used: {', '.join(sorted(hashtags)[:30])}")

    # Write profile + content
    written = []
    all_lines = engagement_lines + lines
    if all_lines:
        path = out / "captions.txt"
        path.write_text("\n\n".join(_deduplicate(all_lines)), encoding="utf-8")
        written.append(path)

    return written


def _extract_tiktok_hydration(data: dict, lines: list, engagement_lines: list):
    """Extract video data from TikTok's hydrated state JSON."""
    # ItemModule contains video objects keyed by video ID
    items = data.get("ItemModule", data.get("itemList", []))
    if isinstance(items, dict):
        items = list(items.values())
    elif not isinstance(items, list):
        return

    for item in items[:30]:
        if not isinstance(item, dict):
            continue

        desc = item.get("desc", "").strip()
        if desc:
            lines.append(f"Video: {desc}")

        # Engagement stats per video
        stats = item.get("stats", {})
        if isinstance(stats, dict):
            views = stats.get("playCount", stats.get("viewCount", ""))
            likes = stats.get("diggCount", stats.get("likeCount", ""))
            comments = stats.get("commentCount", "")
            shares = stats.get("shareCount", "")
            if any([views, likes, comments, shares]):
                parts = []
                if views:
                    parts.append(f"{views} views")
                if likes:
                    parts.append(f"{likes} likes")
                if comments:
                    parts.append(f"{comments} comments")
                if shares:
                    parts.append(f"{shares} shares")
                engagement_lines.append(f"Video engagement: {', '.join(parts)}")

        # Extract hashtags from challenges
        for challenge in item.get("challenges", []):
            if isinstance(challenge, dict):
                title = challenge.get("title", "")
                if title:
                    lines.append(f"Hashtag: #{title}")

        # Extract comments on the video
        for comment in item.get("comments", []):
            if isinstance(comment, dict):
                text = comment.get("text", "").strip()
                if text and len(text) > 5:
                    lines.append(f"Comment: {text}")

    # UserModule contains profile stats
    users = data.get("UserModule", {}).get("users", {})
    if isinstance(users, dict):
        for user in users.values():
            if isinstance(user, dict):
                stats = user.get("stats", {})
                if isinstance(stats, dict):
                    parts = []
                    for key, label in [
                        ("followerCount", "followers"),
                        ("followingCount", "following"),
                        ("heartCount", "likes"),
                        ("videoCount", "videos"),
                    ]:
                        val = stats.get(key, "")
                        if val:
                            parts.append(f"{val} {label}")
                    if parts:
                        engagement_lines.append(f"Profile stats: {', '.join(parts)}")

                bio = user.get("signature", "").strip()
                if bio:
                    lines.append(f"Bio: {bio}")

                nickname = user.get("nickname", "").strip()
                if nickname:
                    lines.append(f"Display name: {nickname}")


def scrape_instagram_web(creator: str, output_dir: Path) -> list[Path]:
    """Scrape Instagram profile page for bio, engagement stats, and content."""
    out = output_dir / "instagram"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    url = f"https://www.instagram.com/{handle}/"
    html = _fetch(url)

    lines = []
    engagement_lines = []

    if html:
        soup = BeautifulSoup(html, "html.parser")

        # -- Meta description: "N Followers, N Following, N Posts - bio text" --
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            content = meta_desc["content"].strip()
            lines.append(f"Instagram Profile: {content}")
            stats = _extract_numbers(content)
            if stats:
                engagement_lines.append(
                    f"Instagram Stats: {', '.join(f'{v} {k}' for k, v in stats.items())}"
                )

        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc and og_desc.get("content"):
            content = og_desc["content"].strip()
            lines.append(f"Instagram Bio: {content}")

        # -- JSON-LD structured data --
        for data in _extract_json_data(soup):
            desc = data.get("description", "")
            name = data.get("name", "")
            alt_name = data.get("alternateName", "")
            if desc:
                lines.append(f"Description: {desc.strip()}")
            if name:
                lines.append(f"Name: {name.strip()}")
            if alt_name:
                lines.append(f"Handle: {alt_name.strip()}")

            # Engagement stats from structured data
            for stat in data.get("interactionStatistic", []):
                if isinstance(stat, dict):
                    stat_type = stat.get("interactionType", "")
                    count = stat.get("userInteractionCount", "")
                    if stat_type and count:
                        type_name = stat_type.replace("http://schema.org/", "")
                        engagement_lines.append(f"Engagement: {type_name} = {count}")

            # Main entity of page (often has follower counts)
            main_entity = data.get("mainEntityofPage", {})
            if isinstance(main_entity, dict):
                for stat in main_entity.get("interactionStatistic", []):
                    if isinstance(stat, dict):
                        count = stat.get("userInteractionCount", "")
                        stat_type = stat.get("interactionType", "")
                        if count and stat_type:
                            engagement_lines.append(f"Stat: {stat_type} = {count}")

        # -- Embedded SharedData (Instagram's hydration) --
        for script in soup.find_all("script"):
            text = script.string or ""
            if "window._sharedData" in text or "window.__additionalDataLoaded" in text:
                match = re.search(r'=\s*(\{.+\})\s*;?\s*$', text, re.DOTALL)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        _extract_instagram_shared_data(data, lines, engagement_lines)
                    except Exception:
                        pass

        # -- Extract hashtags from links --
        hashtags = set()
        for tag in soup.find_all("a", href=re.compile(r"/explore/tags/")):
            ht = tag.get_text(strip=True)
            if ht.startswith("#"):
                hashtags.add(ht)
        if hashtags:
            lines.append(f"Hashtags used: {', '.join(sorted(hashtags)[:30])}")

    written = []
    all_lines = engagement_lines + lines
    if all_lines:
        path = out / "captions.txt"
        path.write_text("\n\n".join(_deduplicate(all_lines)), encoding="utf-8")
        written.append(path)

    return written


def _extract_instagram_shared_data(data: dict, lines: list, engagement_lines: list):
    """Extract post data from Instagram's _sharedData JSON."""
    # Navigate to user data
    user = (
        data.get("entry_data", {})
        .get("ProfilePage", [{}])[0]
        .get("graphql", {})
        .get("user", {})
    )
    if not isinstance(user, dict) or not user:
        return

    bio = user.get("biography", "").strip()
    if bio:
        lines.append(f"Bio: {bio}")

    full_name = user.get("full_name", "").strip()
    if full_name:
        lines.append(f"Full name: {full_name}")

    # Profile engagement stats
    followers = user.get("edge_followed_by", {}).get("count", "")
    following = user.get("edge_follow", {}).get("count", "")
    if followers:
        engagement_lines.append(f"Followers: {followers:,}" if isinstance(followers, int) else f"Followers: {followers}")
    if following:
        engagement_lines.append(f"Following: {following:,}" if isinstance(following, int) else f"Following: {following}")

    # External link (often brand/collab link)
    ext_url = user.get("external_url", "").strip()
    if ext_url:
        lines.append(f"Link in bio: {ext_url}")

    # Is verified?
    if user.get("is_verified"):
        lines.append("Verified account: Yes")

    # Is business/creator account?
    if user.get("is_business_account"):
        lines.append("Account type: Business")
        cat = user.get("business_category_name", "")
        if cat:
            lines.append(f"Business category: {cat}")

    # Recent posts with captions, likes, comments
    edges = user.get("edge_owner_to_timeline_media", {}).get("edges", [])
    for i, edge in enumerate(edges[:20]):
        node = edge.get("node", {})
        if not isinstance(node, dict):
            continue

        caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
        caption = ""
        if caption_edges:
            caption = caption_edges[0].get("node", {}).get("text", "").strip()

        likes = node.get("edge_liked_by", node.get("edge_media_preview_like", {})).get("count", "")
        comments = node.get("edge_media_to_comment", {}).get("count", "")

        if caption:
            lines.append(f"Post {i+1}: {caption}")

        if likes or comments:
            parts = []
            if likes:
                parts.append(f"{likes:,} likes" if isinstance(likes, int) else f"{likes} likes")
            if comments:
                parts.append(f"{comments:,} comments" if isinstance(comments, int) else f"{comments} comments")
            engagement_lines.append(f"Post {i+1} engagement: {', '.join(parts)}")

        # Extract comments on the post
        comment_edges = node.get("edge_media_to_comment", {}).get("edges", [])
        for ce in comment_edges[:5]:
            comment_node = ce.get("node", {})
            comment_text = comment_node.get("text", "").strip()
            if comment_text and len(comment_text) > 5:
                lines.append(f"Comment on post {i+1}: {comment_text}")

        # Extract hashtags from caption
        if caption:
            tags = re.findall(r"#\w+", caption)
            if tags:
                lines.append(f"Post {i+1} hashtags: {', '.join(tags[:10])}")


def scrape_web_presence(creator: str, output_dir: Path) -> list[Path]:
    """Search the web for articles, mentions, brand partnerships, and reviews.

    Uses DuckDuckGo HTML search (no API key needed) with multiple targeted queries
    to build a comprehensive picture of the creator's web presence.
    """
    out = output_dir / "web"
    out.mkdir(parents=True, exist_ok=True)

    handle = creator.strip().lstrip("@")
    queries = [
        # Core identity
        f'"{handle}" UGC creator',
        f'"{handle}" tiktok OR instagram',
        # Brand partnerships and sponsorships
        f'"{handle}" brand partnership OR sponsorship OR collaboration OR ambassador',
        f'"{handle}" #ad OR #sponsored OR #gifted',
        # Engagement and reviews
        f'"{handle}" creator review OR engagement rate',
        # Audience and niche
        f'"{handle}" audience OR niche OR demographic',
    ]

    all_snippets = []
    all_urls = []

    for query in queries:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        html = _fetch(url)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")

        # Result snippets (the text preview under each result)
        for result in soup.find_all("a", class_="result__snippet"):
            text = result.get_text(strip=True)
            if text and len(text) > 30:
                all_snippets.append(text)

        # Result titles (what the page is about)
        for result in soup.find_all("a", class_="result__a"):
            text = result.get_text(strip=True)
            href = result.get("href", "")
            if text and len(text) > 10:
                all_snippets.append(f"Mention: {text}")
            if href and "duckduckgo" not in href:
                all_urls.append(href)

        time.sleep(1.0)  # Rate limit between searches

    # Scrape the top result pages for more detailed content
    detailed_content = []
    for page_url in all_urls[:5]:
        html = _fetch(page_url, timeout=10.0)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")

        # Remove script/style tags
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        # Extract paragraphs mentioning the creator
        for p in soup.find_all(["p", "li"]):
            text = p.get_text(strip=True)
            if handle.lower() in text.lower() and len(text) > 40:
                detailed_content.append(text[:500])

        time.sleep(0.5)

    written = []
    combined = all_snippets + detailed_content
    if combined:
        path = out / "web_mentions.txt"
        path.write_text("\n\n".join(_deduplicate(combined)[:80]), encoding="utf-8")
        written.append(path)

    # Write engagement-specific findings separately for RAG quality
    engagement_snippets = [
        s for s in combined
        if any(kw in s.lower() for kw in [
            "engagement", "follower", "views", "likes", "comments",
            "audience", "rate", "growth", "reach", "impression",
        ])
    ]
    if engagement_snippets:
        path = out / "engagement_data.txt"
        path.write_text("\n\n".join(_deduplicate(engagement_snippets)[:30]), encoding="utf-8")
        written.append(path)

    # Write brand partnership findings separately
    brand_snippets = [
        s for s in combined
        if any(kw in s.lower() for kw in [
            "brand", "sponsor", "partner", "ambassador", "collab",
            "#ad", "#sponsored", "#gifted", "campaign",
        ])
    ]
    if brand_snippets:
        path = out / "brand_partnerships.txt"
        path.write_text("\n\n".join(_deduplicate(brand_snippets)[:20]), encoding="utf-8")
        written.append(path)

    return written
