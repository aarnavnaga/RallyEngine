"""
Instagram scraper: fetch profile and recent posts/captions via Instaloader.
Writes to output_dir/instagram/ as .txt for RAG ingestion.

NOTE: Instaloader often gets 403/429 from Instagram without auth.
This scraper has a 10-second timeout to fail fast and let the web
scraper take over. Set INSTAGRAM_USER/INSTAGRAM_PASSWORD for full access.
"""
import os
import signal
import time
from pathlib import Path


def _rate_limit_delay() -> float:
    try:
        return max(0.0, float(os.environ.get("RATE_LIMIT_DELAY_SECONDS", "1.5")))
    except Exception:
        return 1.5


class _Timeout(Exception):
    pass


def _timeout_handler(signum, frame):
    raise _Timeout("Instagram scraper timed out")


def scrape(creator_identifier: str, output_dir: Path) -> list[Path]:
    """
    Scrape Instagram content for the given creator (username).
    Times out after 10 seconds to avoid blocking the pipeline.
    """
    out = output_dir / "instagram"
    out.mkdir(parents=True, exist_ok=True)
    written = []

    # Set a 10-second alarm to prevent instaloader retry loops from blocking
    old_handler = signal.getsignal(signal.SIGALRM)
    try:
        signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(10)

        import instaloader

        loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            max_connection_attempts=1,
        )
        user = os.environ.get("INSTAGRAM_USER")
        pwd = os.environ.get("INSTAGRAM_PASSWORD")
        if user and pwd:
            try:
                loader.login(user, pwd)
            except Exception:
                pass

        handle = creator_identifier.strip().lstrip("@")
        profile = instaloader.Profile.from_username(loader.context, handle)
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

    except (_Timeout, Exception):
        # Don't write error placeholder — let the web scraper handle it
        pass
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)

    return written
