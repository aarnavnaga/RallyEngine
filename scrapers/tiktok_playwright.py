"""
TikTok scraper (v2) — Playwright for profile stats + yt-dlp for post metrics.

Produces structured JSON outputs:
    {output_dir}/tiktok/profile.json   — handle, name, bio, verified, followers, ...
    {output_dir}/tiktok/posts.json     — list of per-post metrics
    {output_dir}/tiktok/captions.txt   — RAG-ready digest (human-readable)
    {output_dir}/tiktok/metrics.txt    — RAG-ready metrics summary

Design notes:
  * Profile stats come from the SSR'd __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON
    embedded in the profile page HTML. Playwright is used to reliably extract
    this blob (a plain httpx fetch would work too but Playwright handles
    redirects and UA challenges more robustly).
  * Per-post metrics come from yt-dlp, which handles TikTok's anti-bot
    (msToken/X-Bogus) internally and returns clean metadata in a single call.
  * No media is downloaded here — that's Phase 3 of the scraping overhaul.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def _fetch_profile_blob(handle: str, timeout_ms: int = 30000) -> dict[str, Any] | None:
    """Use Playwright to load profile page and extract the rehydration blob."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        logger.warning("playwright not available: %s", e)
        return None

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                ctx = browser.new_context(
                    user_agent=_UA,
                    locale="en-US",
                    viewport={"width": 1366, "height": 900},
                )
                page = ctx.new_page()
                page.goto(
                    f"https://www.tiktok.com/@{handle}",
                    wait_until="domcontentloaded",
                    timeout=timeout_ms,
                )
                locator = page.locator("script#__UNIVERSAL_DATA_FOR_REHYDRATION__").first
                raw = locator.inner_text(timeout=10000)
                if not raw:
                    return None
                return json.loads(raw)
            finally:
                browser.close()
    except Exception as e:
        logger.warning("playwright profile fetch failed for %s: %s", handle, e)
        return None


def _parse_profile(blob: dict[str, Any]) -> dict[str, Any]:
    """Extract profile fields from the rehydration blob."""
    try:
        info = blob["__DEFAULT_SCOPE__"]["webapp.user-detail"]["userInfo"]
    except Exception:
        return {}
    user = info.get("user") or {}
    stats = info.get("stats") or {}
    return {
        "handle": user.get("uniqueId"),
        "name": user.get("nickname"),
        "bio": user.get("signature"),
        "verified": bool(user.get("verified")),
        "avatar_url": user.get("avatarLarger") or user.get("avatarMedium"),
        "bio_link": (user.get("bioLink") or {}).get("link"),
        "private": bool(user.get("privateAccount")),
        "commerce_user": bool(user.get("ttSeller")),
        "follower_count": stats.get("followerCount"),
        "following_count": stats.get("followingCount"),
        "heart_count": stats.get("heartCount") or stats.get("heart"),
        "video_count": stats.get("videoCount"),
        "friend_count": stats.get("friendCount"),
    }


def _fetch_posts_via_ytdlp(handle: str, limit: int = 15) -> list[dict[str, Any]]:
    """Use yt-dlp to flat-extract recent videos for a TikTok user."""
    try:
        import yt_dlp
    except Exception as e:
        logger.warning("yt-dlp not available: %s", e)
        return []

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": "in_playlist",
        "playlistend": limit,
        "skip_download": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(
                f"https://www.tiktok.com/@{handle}",
                download=False,
            )
    except Exception as e:
        logger.warning("yt-dlp failed for %s: %s", handle, e)
        return []

    entries = info.get("entries") if isinstance(info, dict) else None
    if not entries:
        return []

    posts: list[dict[str, Any]] = []
    for e in entries:
        if not isinstance(e, dict):
            continue
        posts.append(
            {
                "id": e.get("id"),
                "url": e.get("url") or e.get("webpage_url"),
                "title": e.get("title"),
                "description": e.get("description"),
                "view_count": e.get("view_count"),
                "like_count": e.get("like_count"),
                "comment_count": e.get("comment_count"),
                "repost_count": e.get("repost_count"),
                "save_count": e.get("save_count"),
                "duration_sec": e.get("duration"),
                "timestamp": e.get("timestamp"),
                "uploader": e.get("uploader"),
                "uploader_id": e.get("uploader_id"),
                "channel": e.get("channel"),
                "thumbnail": (e.get("thumbnails") or [{}])[-1].get("url")
                if isinstance(e.get("thumbnails"), list)
                else None,
                "track": e.get("track"),
                "artists": e.get("artists"),
            }
        )
    return posts


def _compute_metrics(profile: dict[str, Any], posts: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute aggregate analytics from profile + posts."""
    if not posts:
        return {"post_count_sampled": 0}

    def _avg(vals: list[int | float | None]) -> float | None:
        clean = [v for v in vals if isinstance(v, (int, float))]
        return round(sum(clean) / len(clean), 2) if clean else None

    def _sum(vals: list[int | float | None]) -> int:
        return int(sum(v for v in vals if isinstance(v, (int, float))))

    likes = [p.get("like_count") for p in posts]
    comments = [p.get("comment_count") for p in posts]
    views = [p.get("view_count") for p in posts]
    reposts = [p.get("repost_count") for p in posts]
    durations = [p.get("duration_sec") for p in posts]

    avg_likes = _avg(likes)
    avg_comments = _avg(comments)
    avg_views = _avg(views)
    followers = profile.get("follower_count") or 0

    # Engagement rate on followers — standard industry metric
    engagement_rate_followers = None
    if followers and avg_likes is not None:
        engagement_rate_followers = round(
            ((avg_likes + (avg_comments or 0)) / followers) * 100, 3
        )

    # Engagement rate on views — better for viral FYP-driven content
    # where reach exceeds follower count
    engagement_rate_views = None
    if avg_views and avg_likes is not None:
        engagement_rate_views = round(
            ((avg_likes + (avg_comments or 0)) / avg_views) * 100, 3
        )

    # Best post by likes
    best = max(
        (p for p in posts if isinstance(p.get("like_count"), (int, float))),
        key=lambda p: p.get("like_count") or 0,
        default=None,
    )

    # Sponsored heuristic: hashtag or @ mention in description
    sponsored_markers = ("#ad", "#sponsored", "#gifted", "#partner", "#paidpartnership")
    sponsored = 0
    for p in posts:
        text = (p.get("description") or p.get("title") or "").lower()
        if any(m in text for m in sponsored_markers):
            sponsored += 1

    return {
        "post_count_sampled": len(posts),
        "follower_count": followers,
        "avg_likes": avg_likes,
        "avg_comments": avg_comments,
        "avg_views": avg_views,
        "avg_reposts": _avg(reposts),
        "total_likes_sampled": _sum(likes),
        "total_views_sampled": _sum(views),
        "engagement_rate_on_followers_percent": engagement_rate_followers,
        "engagement_rate_on_views_percent": engagement_rate_views,
        "avg_duration_sec": _avg(durations),
        "sponsored_posts_detected": sponsored,
        "sponsored_ratio_percent": round((sponsored / len(posts)) * 100, 1)
        if posts
        else 0.0,
        "best_post": {
            "id": best.get("id"),
            "likes": best.get("like_count"),
            "views": best.get("view_count"),
            "comments": best.get("comment_count"),
            "description": best.get("description"),
        }
        if best
        else None,
    }


def _format_digest(profile: dict[str, Any], posts: list[dict[str, Any]], metrics: dict[str, Any]) -> str:
    """Generate a human-readable digest for RAG ingestion."""
    lines: list[str] = []
    handle = profile.get("handle") or "unknown"
    name = profile.get("name") or handle
    verified = " (verified)" if profile.get("verified") else ""

    lines.append(f"TikTok Profile: {name}{verified} (@{handle})")
    if profile.get("bio"):
        lines.append(f"Bio: {profile['bio']}")
    if profile.get("bio_link"):
        lines.append(f"Bio Link: {profile['bio_link']}")

    if profile.get("follower_count") is not None:
        lines.append(
            f"Followers: {profile['follower_count']:,} | "
            f"Following: {profile.get('following_count') or 0:,} | "
            f"Total Likes: {profile.get('heart_count') or 0:,} | "
            f"Total Videos: {profile.get('video_count') or 0:,}"
        )

    if metrics.get("post_count_sampled"):
        lines.append("")
        lines.append(
            f"Recent Activity ({metrics['post_count_sampled']} latest videos sampled):"
        )
        er_f = metrics.get("engagement_rate_on_followers_percent")
        er_v = metrics.get("engagement_rate_on_views_percent")
        if er_f is not None:
            lines.append(
                f"  Engagement Rate (on followers): {er_f}% "
                f"(avg likes+comments / followers)"
            )
        if er_v is not None:
            lines.append(
                f"  Engagement Rate (on views):     {er_v}% "
                f"(avg likes+comments / avg views)"
            )
        if metrics.get("avg_views") is not None:
            lines.append(
                f"  Avg Views: {int(metrics['avg_views']):,} | "
                f"Avg Likes: {int(metrics['avg_likes'] or 0):,} | "
                f"Avg Comments: {int(metrics['avg_comments'] or 0):,} | "
                f"Avg Reposts: {int(metrics['avg_reposts'] or 0):,}"
            )
        if metrics.get("avg_duration_sec") is not None:
            lines.append(f"  Avg Video Duration: {metrics['avg_duration_sec']}s")
        lines.append(
            f"  Sponsored Posts Detected: {metrics['sponsored_posts_detected']} "
            f"({metrics['sponsored_ratio_percent']}% of sampled)"
        )

    best = metrics.get("best_post") or {}
    if best and best.get("likes"):
        lines.append("")
        lines.append(
            f"Top Performing Video: {best.get('likes'):,} likes | "
            f"{best.get('views') or 0:,} views | {best.get('comments') or 0:,} comments"
        )
        if best.get("description"):
            lines.append(f"  Caption: {best['description'][:300]}")

    lines.append("")
    lines.append("Recent Video Captions:")
    for i, p in enumerate(posts, start=1):
        desc = p.get("description") or p.get("title") or ""
        stats = (
            f"({p.get('view_count') or 0:,} views, "
            f"{p.get('like_count') or 0:,} likes, "
            f"{p.get('comment_count') or 0:,} comments)"
        )
        lines.append(f"  {i:2d}. {stats} {desc[:250]}")

    return "\n".join(lines)


def scrape(creator_identifier: str, output_dir: Path, limit: int = 15) -> list[Path]:
    """
    Main entry. Returns list of written file paths. Empty list on total failure.
    """
    handle = creator_identifier.strip().lstrip("@")
    out = output_dir / "tiktok"
    out.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    # 1) Profile via Playwright rehydration blob
    blob = _fetch_profile_blob(handle)
    profile = _parse_profile(blob) if blob else {}

    # 2) Posts via yt-dlp
    posts = _fetch_posts_via_ytdlp(handle, limit=limit)

    # If we got neither, bail
    if not profile and not posts:
        return written

    # 3) Compute metrics
    metrics = _compute_metrics(profile, posts)

    # 4) Write structured JSON
    profile_path = out / "profile.json"
    profile_path.write_text(
        json.dumps({"profile": profile, "metrics": metrics}, indent=2),
        encoding="utf-8",
    )
    written.append(profile_path)

    posts_path = out / "posts.json"
    posts_path.write_text(json.dumps(posts, indent=2), encoding="utf-8")
    written.append(posts_path)

    # 5) Write RAG digest
    digest = _format_digest(profile, posts, metrics)
    digest_path = out / "captions.txt"
    digest_path.write_text(digest, encoding="utf-8")
    written.append(digest_path)

    return written
