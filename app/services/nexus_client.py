"""Thin wrapper around the real Nexus Mods public API (https://api.nexusmods.com/v1).

Reference: https://app.swaggerhub.com/apis-docs/NexusMods/nexus-mods_public_api_params_in_form_data/1.0
The public API has no free-text search endpoint - only curated lists (trending,
latest_added, latest_updated), lookup by exact mod id, and per-file download links
(the latter restricted to Premium accounts).
"""

import logging
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger("palworld_admin.nexus_client")

BASE_URL = "https://api.nexusmods.com/v1"
GAME_DOMAIN = "palworld"


class NexusApiError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


async def _get(path: str, api_key: str, params: dict[str, Any] | None = None, premium_hint: bool = False) -> Any:
    """premium_hint should only be set for calls confirmed to be Premium-gated
    (currently just get_download_link) - a 403 anywhere else is unexpected and
    shouldn't be blamed on Premium when we're not actually sure that's why."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE_URL}{path}",
            headers={"apikey": api_key, "Accept": "application/json"},
            params=params,
        )
    remaining = resp.headers.get("x-rl-hourly-remaining")
    logger.info(
        "GET %s -> %s%s",
        path,
        resp.status_code,
        f" (hourly quota remaining: {remaining})" if remaining else "",
    )
    if resp.status_code == 401:
        raise NexusApiError(401, "Invalid or expired Nexus Mods API key.")
    if resp.status_code == 403:
        message = "Nexus Mods Premium is required for this action." if premium_hint else "Nexus Mods rejected this request (403)."
        raise NexusApiError(403, message)
    if resp.status_code == 429:
        raise NexusApiError(429, "Nexus Mods API rate limit exceeded. Try again later.")
    if resp.status_code >= 400:
        raise NexusApiError(resp.status_code, f"Nexus Mods API error ({resp.status_code}).")
    return resp.json()


async def validate_key(api_key: str) -> dict[str, Any]:
    return await _get("/users/validate.json", api_key)


_LIST_ENDPOINTS = {
    "trending": "/trending.json",
    "latest_added": "/latest_added.json",
    "latest_updated": "/latest_updated.json",
}


async def get_mod_list(api_key: str, list_name: str) -> list[dict[str, Any]]:
    endpoint = _LIST_ENDPOINTS[list_name]
    return await _get(f"/games/{GAME_DOMAIN}/mods{endpoint}", api_key)


async def get_game_categories(api_key: str) -> list[dict[str, Any]]:
    data = await _get(f"/games/{GAME_DOMAIN}.json", api_key)
    return data.get("categories", [])


async def get_mod_details(api_key: str, mod_id: int) -> dict[str, Any]:
    return await _get(f"/games/{GAME_DOMAIN}/mods/{mod_id}.json", api_key)


async def get_mod_files(api_key: str, mod_id: int) -> dict[str, Any]:
    return await _get(f"/games/{GAME_DOMAIN}/mods/{mod_id}/files.json", api_key)


async def md5_search(api_key: str, md5_hash: str) -> list[dict[str, Any]]:
    """Reverse-lookup: given a file's MD5, returns every mod+file on Nexus
    (scoped to GAME_DOMAIN by the URL itself) whose uploaded file has that
    exact hash. An empty list means this exact file isn't a real, published
    file for this game on Nexus at all - used to cryptographically verify an
    uploaded file actually matches a real mod, not just a claimed one."""
    return await _get(f"/games/{GAME_DOMAIN}/mods/md5_search/{md5_hash}.json", api_key)


async def get_download_link(api_key: str, mod_id: int, file_id: int) -> list[dict[str, Any]]:
    return await _get(
        f"/games/{GAME_DOMAIN}/mods/{mod_id}/files/{file_id}/download_link.json",
        api_key,
        premium_hint=True,
    )


async def download_file(url: str, dest_path: Path) -> None:
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            total = resp.headers.get("content-length")
            logger.info("Downloading file mirror -> %s (%s bytes)", dest_path, total or "unknown")
            written = 0
            with open(dest_path, "wb") as f:
                async for chunk in resp.aiter_bytes():
                    f.write(chunk)
                    written += len(chunk)
    logger.info("Download finished: %s (%d bytes written)", dest_path, written)
