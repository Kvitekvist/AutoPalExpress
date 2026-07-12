"""Cached, non-fatal checks for published AutoPalExpress GitHub releases."""

import asyncio
import logging
import re
import time
from datetime import datetime
from typing import Any
from urllib.parse import quote

import httpx

from app.version import APP_VERSION

logger = logging.getLogger("palworld_admin.app_update")

LATEST_RELEASE_URL = "https://api.github.com/repos/Kvitekvist/AutoPalExpress/releases/latest"
RELEASE_PAGE_BASE = "https://github.com/Kvitekvist/AutoPalExpress/releases/tag/"
SUCCESS_CACHE_SECONDS = 6 * 60 * 60
FAILURE_CACHE_SECONDS = 15 * 60

_cache: dict[str, Any] | None = None
_cache_expires_at = 0.0
_lock = asyncio.Lock()
_VERSION_RE = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)$", re.IGNORECASE)


def _version_tuple(value: str) -> tuple[int, int, int] | None:
    match = _VERSION_RE.fullmatch(value.strip())
    return tuple(int(part) for part in match.groups()) if match else None


def _unavailable() -> dict[str, Any]:
    return {
        "currentVersion": APP_VERSION,
        "latestVersion": None,
        "updateAvailable": False,
        "releaseUrl": None,
        "releaseName": None,
        "publishedAt": None,
        "available": False,
    }


async def get_status() -> dict[str, Any]:
    global _cache, _cache_expires_at
    now = time.monotonic()
    if _cache is not None and now < _cache_expires_at:
        return dict(_cache)

    async with _lock:
        now = time.monotonic()
        if _cache is not None and now < _cache_expires_at:
            return dict(_cache)

        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                response = await client.get(
                    LATEST_RELEASE_URL,
                    headers={
                        "Accept": "application/vnd.github+json",
                        "User-Agent": f"AutoPalExpress/{APP_VERSION}",
                        "X-GitHub-Api-Version": "2026-03-10",
                    },
                )
            response.raise_for_status()
            release = response.json()
            tag = str(release.get("tag_name") or "").strip()
            latest = _version_tuple(tag)
            current = _version_tuple(APP_VERSION)
            if release.get("draft") or release.get("prerelease") or latest is None or current is None:
                raise ValueError("GitHub latest release returned unsupported release metadata.")

            published_at = release.get("published_at")
            if published_at:
                datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))

            _cache = {
                "currentVersion": APP_VERSION,
                "latestVersion": tag.removeprefix("v").removeprefix("V"),
                "updateAvailable": latest > current,
                "releaseUrl": f"{RELEASE_PAGE_BASE}{quote(tag, safe='')}",
                "releaseName": str(release.get("name") or tag),
                "publishedAt": published_at,
                "available": True,
            }
            _cache_expires_at = time.monotonic() + SUCCESS_CACHE_SECONDS
        except (httpx.HTTPError, ValueError, TypeError) as error:
            logger.warning("GitHub update check unavailable: %s", error)
            _cache = _unavailable()
            _cache_expires_at = time.monotonic() + FAILURE_CACHE_SECONDS

        return dict(_cache)
