"""Lets the super admin mark a port's manual forwarding as verified working
(TICKET-0140), for the Dashboard traffic lights to show green instead of
yellow when there's no UPnP router available to auto-confirm reachability -
the app itself has no way to test real internet reachability on its own, so
this only exists as an explicit human claim, not an automated check.

Stored against the exact port number verified. If that port later changes
(the server's game/query port edited, or - in practice never, but handled
the same way - the fixed admin port), the stored value no longer matches
and reads back as unverified again, since the claim was only ever about
that specific port.
"""

from typing import Any

from app import storage
from app.services import instance_storage

_STORE_NAME = "network_verification"
_ADMIN_STORE_NAME = "network_verification"


def _instance_defaults() -> dict[str, Any]:
    return {"gamePort": None, "queryPort": None}


def is_game_verified(instance_id: str, port: int | None) -> bool:
    if port is None:
        return False
    data = instance_storage.load(instance_id, _STORE_NAME, _instance_defaults())
    return data.get("gamePort") == port


def set_game_verified(instance_id: str, port: int) -> None:
    data = instance_storage.load(instance_id, _STORE_NAME, _instance_defaults())
    data["gamePort"] = port
    instance_storage.save(instance_id, _STORE_NAME, data)


def clear_game_verified(instance_id: str) -> None:
    data = instance_storage.load(instance_id, _STORE_NAME, _instance_defaults())
    data["gamePort"] = None
    instance_storage.save(instance_id, _STORE_NAME, data)


def is_query_verified(instance_id: str, port: int | None) -> bool:
    if port is None:
        return False
    data = instance_storage.load(instance_id, _STORE_NAME, _instance_defaults())
    return data.get("queryPort") == port


def set_query_verified(instance_id: str, port: int) -> None:
    data = instance_storage.load(instance_id, _STORE_NAME, _instance_defaults())
    data["queryPort"] = port
    instance_storage.save(instance_id, _STORE_NAME, data)


def clear_query_verified(instance_id: str) -> None:
    data = instance_storage.load(instance_id, _STORE_NAME, _instance_defaults())
    data["queryPort"] = None
    instance_storage.save(instance_id, _STORE_NAME, data)


def is_admin_verified(port: int) -> bool:
    data = storage.load(_ADMIN_STORE_NAME, {"adminPort": None})
    return data.get("adminPort") == port


def set_admin_verified(port: int) -> None:
    storage.save(_ADMIN_STORE_NAME, {"adminPort": port})


def clear_admin_verified() -> None:
    storage.save(_ADMIN_STORE_NAME, {"adminPort": None})
