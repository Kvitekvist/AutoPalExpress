"""Thin wrappers around Nexus Mods APIs.

Public browsing and file-hash lookups use Nexus' GraphQL API so they do not
depend on a personal API key. Direct installs use the stored super-admin API
key and Nexus' REST download-link endpoint.
"""

import logging
from pathlib import Path
from typing import Any

import httpx

from app.version import APP_VERSION

logger = logging.getLogger("palworld_admin.nexus_client")

BASE_URL = "https://api.nexusmods.com/v1"
GRAPHQL_URL = "https://api.nexusmods.com/v2/graphql"
GAME_DOMAIN = "palworld"
GAME_ID = 6063  # Palworld's numeric Nexus game id, needed by GraphQL's modId filter
APP_NAME = "AutoPalExpress"


class NexusApiError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)

    @property
    def http_status(self) -> int:
        """Status to surface on AutoPalExpress's own API, not Nexus's raw one.
        Nexus's 401 means "that Nexus API key is invalid/expired" - it must
        never become our own HTTP 401, which the frontend treats as "your
        AutoPalExpress session died" and force-logs the user out over."""
        return 400 if self.status_code == 401 else self.status_code


def _headers(api_key: str | None = None) -> dict[str, str]:
    headers = {
        "Accept": "application/json",
        "Application-Name": APP_NAME,
        "Application-Version": APP_VERSION,
    }
    if api_key:
        headers["apikey"] = api_key
    return headers


async def _get(path: str, api_key: str, params: dict[str, Any] | None = None, premium_hint: bool = False) -> Any:
    """premium_hint should only be set for calls confirmed to be Premium-gated
    (currently just get_download_link) - a 403 anywhere else is unexpected and
    shouldn't be blamed on Premium when we're not actually sure that's why."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE_URL}{path}",
            headers=_headers(api_key),
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


async def _graphql(query: str, variables: dict[str, Any] | None = None) -> Any:
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            GRAPHQL_URL,
            headers=_headers(),
            json={"query": query, "variables": variables or {}},
        )
    logger.info("POST GraphQL -> %s", resp.status_code)
    if resp.status_code == 429:
        raise NexusApiError(429, "Nexus Mods API rate limit exceeded. Try again later.")
    if resp.status_code >= 400:
        raise NexusApiError(resp.status_code, f"Nexus Mods API error ({resp.status_code}).")

    data = resp.json()
    if data.get("errors"):
        message = data["errors"][0].get("message") or "Nexus Mods GraphQL request failed."
        raise NexusApiError(502, message)
    return data.get("data") or {}


async def validate_key(api_key: str) -> dict[str, Any]:
    return await _get("/users/validate.json", api_key)


_GRAPHQL_SORTS = {
    "trending": {"downloads": {"direction": "DESC"}},
    "latest_added": {"createdAt": {"direction": "DESC"}},
    "latest_updated": {"updatedAt": {"direction": "DESC"}},
}


_MODS_PAGE_QUERY = """
query AutoPalExpressModsPage($filter: ModsFilter, $sort: [ModsSort!], $count: Int, $offset: Int) {
  mods(filter: $filter, sort: $sort, count: $count, offset: $offset) {
    totalCount
    nodes {
      modId
      name
      author
      summary
      category
      downloads
      endorsements
      pictureUrl
      directDownloadEnabled
    }
  }
}
"""

PAGE_SIZE = 60


async def _mods_page(filter_: dict[str, Any], sort: list[dict[str, Any]], offset: int) -> dict[str, Any]:
    variables = {"filter": filter_, "sort": sort, "count": PAGE_SIZE, "offset": offset}
    data = await _graphql(_MODS_PAGE_QUERY, variables)
    mods = data.get("mods") or {}
    return {"nodes": mods.get("nodes") or [], "totalCount": mods.get("totalCount") or 0}


async def get_mod_list(list_name: str, offset: int = 0) -> dict[str, Any]:
    """Returns one page (PAGE_SIZE items) plus totalCount (TICKET-0149) so
    callers can page through the rest instead of only ever seeing a fixed
    first 60."""
    filter_ = {"gameDomainName": [{"value": GAME_DOMAIN, "op": "EQUALS"}]}
    return await _mods_page(filter_, [_GRAPHQL_SORTS[list_name]], offset)


async def search_mods(query: str, offset: int = 0) -> dict[str, Any]:
    """Real server-side search by name (TICKET-0144), instead of the old
    approach of only ever filtering whatever 60 mods happened to already be
    loaded into trending/latest_added/latest_updated - which meant most
    published Palworld mods could never be found by searching for them at
    all. Nexus's GraphQL `name` filter does plain case-insensitive substring
    matching when given `op: WILDCARD` with no wildcard characters in the
    value itself (confirmed directly against the live API - `*`/`%` are NOT
    wildcard tokens here, despite the operator's name). Paginated (TICKET-0149)
    since a broad search term can easily match more than one page's worth."""
    filter_ = {
        "gameDomainName": [{"value": GAME_DOMAIN, "op": "EQUALS"}],
        "name": [{"value": query, "op": "WILDCARD"}],
    }
    return await _mods_page(filter_, [{"downloads": {"direction": "DESC"}}], offset)


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


async def file_hash_search(md5_hash: str) -> list[dict[str, Any]]:
    query = """
    query AutoPalExpressFileHash($md5: String!) {
      fileHash(md5: $md5) {
        fileName
        fileSize
        fileType
        gameId
        md5
        modFile {
          fileId
          modId
          name
          version
          mod {
            modId
            name
            author
            summary
            category
            game {
              domainName
            }
          }
        }
      }
    }
    """
    data = await _graphql(query, {"md5": md5_hash})
    matches = data.get("fileHash") or []
    return [
        match
        for match in matches
        if (((match.get("modFile") or {}).get("mod") or {}).get("game") or {}).get("domainName") == GAME_DOMAIN
    ]


async def get_current_versions(mod_ids: list[int]) -> dict[int, str]:
    """Keyless GraphQL lookup of each mod's currently-published version, used
    to compute real update availability instead of the old always-false
    placeholder. Confirmed live that `modId` filtering requires `gameId`
    alongside it, and that OR-combining one sub-filter per mod id (via the
    nested `filter`/`op: OR` shape) is how to batch several mod ids into a
    single request - Nexus's GraphQL schema has no `IN`/list-value operator
    for a single filter field."""
    if not mod_ids:
        return {}
    query = """
    query AutoPalExpressModVersions($subFilters: [ModsFilter!]) {
      mods(filter: {op: OR, filter: $subFilters}) {
        nodes {
          modId
          version
        }
      }
    }
    """
    sub_filters = [
        {"gameId": {"value": str(GAME_ID), "op": "EQUALS"}, "modId": {"value": str(mod_id), "op": "EQUALS"}}
        for mod_id in mod_ids
    ]
    data = await _graphql(query, {"subFilters": sub_filters})
    nodes = (data.get("mods") or {}).get("nodes") or []
    return {n["modId"]: n["version"] for n in nodes if n.get("version")}


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
