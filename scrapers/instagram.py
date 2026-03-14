"""
Instagram scraper: fetch profile and recent posts/captions via Instaloader.
Writes to output_dir/instagram/ as .txt for RAG ingestion.
Rate limiting via RATE_LIMIT_DELAY_SECONDS (default 1.5s between posts).
"""
import os
import time
from pathlib import Path


def _rate_limit_delay() -> float:
    try:
        return max(0.0, float(os.environ.get("RATE_LIMIT_DELAY_SECONDS", "1.5")))
    except Exception:
        return 1.5


def scrape(creator_identifier: str, output_dir: Path) -> list[Path]:
    """
    Scrape Instagram content for the given creator (username).
    Writes captions to output_dir/instagram/captions.txt.
    Returns list of written file paths.
    """
    out = output_dir / "instagram"
    out.mkdir(parents=True, exist_ok=True)
    written = []

    try:
        import instaloader
        import os

        loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
        )
        # Optional login for higher limits (set INSTAGRAM_USER, INSTAGRAM_PASSWORD in env)
        user = os.environ.get("INSTAGRAM_USER")
        pwd = os.environ.get("INSTAGRAM_PASSWORD")
        if user and pwd:
            try:
                loader.login(user, pwd)
            except Exception:
                pass

        profile = instaloader.Profile.from_username(loader.context, creator_identifier.strip().lstrip("@"))
        lines = []
        delay = _rate_limit_delay()
        for i, post in enumerate(profile.get_posts()):
            if i >= 50:
                break
            if i > 0:
                time.sleep(delay)
            caption = (post.caption or "").strip()
            if caption:
                lines.append(f"Post {i + 1}: {caption}")
        if lines:
            path = out / "captions.txt"
            path.write_text("\n\n".join(lines), encoding="utf-8")
            written.append(path)
    except Exception as e:
        fallback = out / "captions.txt"
        if not fallback.exists():
            fallback.write_text(
                f"# Instagram scrape placeholder for {creator_identifier}\n# Error: {e}\n# Add captions here or set INSTAGRAM_USER/PASSWORD and run again.",
                encoding="utf-8",
            )
            written.append(fallback)

    return written
