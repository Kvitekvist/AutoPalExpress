"""Persists a roster of every player ever seen connected to a given
instance, keyed by steamid. Palworld's RCON `ShowPlayers` only lists
currently-connected players - without this, anyone who disconnects would
vanish from the roster entirely instead of showing up as offline.
"""

import time
from typing import Any

from app.services import instance_storage

_STORE_NAME = "players"


def _load(instance_id: str) -> dict[str, Any]:
    return instance_storage.load(instance_id, _STORE_NAME, {})


def _save(instance_id: str, data: dict[str, Any]) -> None:
    instance_storage.save(instance_id, _STORE_NAME, data)


def sync_online(instance_id: str, online: list[dict[str, str]]) -> dict[str, Any]:
    """Records the given currently-connected players as seen now, and
    returns the full known roster (currently-online and previously-seen
    offline players) for this instance."""
    data = _load(instance_id)
    now = time.time()
    online_ids = {p["steamid"] or p["playeruid"] for p in online}
    for p in online:
        steamid = p["steamid"] or p["playeruid"]
        entry = data.setdefault(steamid, {"firstSeen": now, "isBanned": False})
        entry["name"] = p["name"]
        entry["lastSeen"] = now
    for steamid, entry in data.items():
        entry["online"] = steamid in online_ids
    _save(instance_id, data)
    return data


def get_name(instance_id: str, steamid: str) -> str | None:
    return _load(instance_id).get(steamid, {}).get("name")


def set_banned(instance_id: str, steamid: str, banned: bool) -> None:
    data = _load(instance_id)
    if steamid in data:
        data[steamid]["isBanned"] = banned
        _save(instance_id, data)
