"""Palworld Dedicated Server REST API client.

The official API is intended for LAN/local use, uses HTTP Basic Auth, and is
enabled from PalWorldSettings.ini with RESTAPIEnabled=True. Calls here target
127.0.0.1 because this app runs on the same machine as the server.
"""

from pathlib import Path
from typing import Any

import httpx

from app.services import palworld_settings


class PalworldRestError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class PalworldRestNotConfiguredError(PalworldRestError):
    pass


class PalworldRestAuthError(PalworldRestError):
    pass


class PalworldRestConnectionError(PalworldRestError):
    pass


def _instance_rest_port(instance: dict[str, Any]) -> int | None:
    port = instance.get("rconPort") or instance.get("restPort")
    try:
        return int(port) if port else None
    except (TypeError, ValueError):
        return None


def get_credentials(instance: dict[str, Any]) -> tuple[str, int, str] | None:
    config = palworld_settings.read_rest_config(Path(instance["serverPath"]))
    port = config["port"] if config and config.get("enabled") and config.get("port") else _instance_rest_port(instance)
    if not port:
        return None
    password = config.get("password") if config else None
    if config and config.get("enabled") and config.get("port") and not password:
        return None
    return "127.0.0.1", int(port), password or ""


def is_ready(instance: dict[str, Any]) -> bool:
    return get_credentials(instance) is not None


async def _request(
    instance: dict[str, Any],
    method: str,
    path: str,
    *,
    json: dict[str, Any] | None = None,
    timeout: float = 5.0,
) -> Any:
    creds = get_credentials(instance)
    if not creds:
        raise PalworldRestNotConfiguredError(
            "Palworld REST API is not ready for this server. Turn on REST API Enabled and set a REST API Port "
            "in World Settings first. Admin Password must also be set, or restart the server through AutoPalExpress "
            "so it can create one."
        )

    host, port, password = creds
    url = f"http://{host}:{port}/v1/api{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.request(method, url, auth=httpx.BasicAuth("admin", password), json=json)
    except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
        raise PalworldRestConnectionError(f"Could not reach Palworld REST API at {host}:{port}: {e}")

    if resp.status_code == 401:
        raise PalworldRestAuthError("Palworld REST API authentication failed. Check the Admin Password in World Settings.")
    if resp.status_code >= 400:
        detail = resp.text.strip() or f"HTTP {resp.status_code}"
        raise PalworldRestError(f"Palworld REST API rejected the request: {detail}")
    if not resp.content:
        return None
    try:
        return resp.json()
    except ValueError:
        return None


async def info(instance: dict[str, Any]) -> dict[str, Any]:
    return await _request(instance, "GET", "/info")


async def metrics(instance: dict[str, Any]) -> dict[str, Any]:
    return await _request(instance, "GET", "/metrics")


def _first_present(player: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = player.get(key)
        if value not in (None, ""):
            return value
    return None


def normalize_player(player: dict[str, Any]) -> dict[str, Any]:
    """Accept small naming differences between Palworld REST builds.

    The rest of the app uses camelCase. Some observed/documented payloads use
    all-lowercase or snake_case names, so normalize once at the API boundary.
    """
    normalized = dict(player)
    user_id = _first_present(player, "userId", "userid", "user_id", "steamId", "steamid", "steam_id")
    player_id = _first_present(player, "playerId", "playeruid", "playerUid", "player_id", "player_uid")
    name = _first_present(player, "name", "characterName", "character_name", "playerName", "player_name")
    account_name = _first_present(player, "accountName", "account_name")
    level = _first_present(player, "level", "playerLevel", "player_level")
    ping = _first_present(player, "ping", "pingMs", "ping_ms")

    if user_id is not None:
        normalized["userId"] = str(user_id)
    if player_id is not None:
        normalized["playerId"] = str(player_id)
    if name is not None:
        normalized["name"] = str(name)
    if account_name is not None:
        normalized["accountName"] = str(account_name)
    if level is not None:
        normalized["level"] = level
    if ping is not None:
        normalized["ping"] = ping
    return normalized


def player_key(player: dict[str, Any]) -> str:
    normalized = normalize_player(player)
    return str(normalized.get("userId") or normalized.get("playerId") or "")


def player_display_name(player: dict[str, Any]) -> str:
    normalized = normalize_player(player)
    return str(normalized.get("name") or normalized.get("accountName") or player_key(normalized) or "Unknown")


async def players(instance: dict[str, Any]) -> list[dict[str, Any]]:
    data = await _request(instance, "GET", "/players")
    return [normalize_player(player) for player in ((data or {}).get("players") or [])]


async def announce(instance: dict[str, Any], message: str) -> None:
    await _request(instance, "POST", "/announce", json={"message": message})


async def save(instance: dict[str, Any]) -> None:
    await _request(instance, "POST", "/save", timeout=10.0)


async def kick_player(instance: dict[str, Any], user_id: str, message: str = "") -> None:
    await _request(instance, "POST", "/kick", json={"userid": user_id, "message": message})


async def ban_player(instance: dict[str, Any], user_id: str, message: str = "") -> None:
    await _request(instance, "POST", "/ban", json={"userid": user_id, "message": message})


async def unban_player(instance: dict[str, Any], user_id: str) -> None:
    await _request(instance, "POST", "/unban", json={"userid": user_id})


async def shutdown(instance: dict[str, Any], wait_seconds: int, message: str = "") -> None:
    await _request(instance, "POST", "/shutdown", json={"waittime": wait_seconds, "message": message}, timeout=10.0)


async def force_stop(instance: dict[str, Any]) -> None:
    await _request(instance, "POST", "/stop", timeout=10.0)
