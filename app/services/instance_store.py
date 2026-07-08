"""Registry of managed Palworld server instances. Each instance is a fully
independent PalServer install (its own folder, own Mods, own UE4SS install,
own ports) so multiple servers can run on one machine without their mods or
config colliding. Exactly one instance is "active" at a time - the existing
mods/UE4SS/etc. endpoints all operate on whichever instance is active, so
switching instances is what changes what those endpoints act on.
"""

import json
import shutil
import time
import uuid
from pathlib import Path
from typing import Any

from app import storage
from app.paths import data_dir

_STORE_NAME = "instances"

DATA_DIR = data_dir()
INSTANCES_DIR = DATA_DIR / "instances"
INSTANCES_DIR.mkdir(parents=True, exist_ok=True)


def _load() -> dict[str, Any]:
    return storage.load(_STORE_NAME, {"activeId": None, "instances": []})


def _save(data: dict[str, Any]) -> None:
    storage.save(_STORE_NAME, data)


def list_instances() -> list[dict[str, Any]]:
    return _load()["instances"]


def get_active_id() -> str | None:
    return _load()["activeId"]


def get(instance_id: str) -> dict[str, Any] | None:
    return next((i for i in list_instances() if i["id"] == instance_id), None)


def get_active() -> dict[str, Any] | None:
    active_id = get_active_id()
    return get(active_id) if active_id else None


def instance_dir(instance_id: str) -> Path:
    d = INSTANCES_DIR / instance_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def create_instance(
    *, name: str, server_path: str, source: str, game_port: int = 8211, rcon_port: int = 8212
) -> dict[str, Any]:
    data = _load()
    instance = {
        "id": f"srv-{uuid.uuid4().hex[:10]}",
        "name": name,
        "serverPath": server_path,
        "source": source,  # "deployed" | "steam" | "manual"
        "gamePort": game_port,
        "rconPort": rcon_port,
        "communityServer": False,
        "createdAt": time.time(),
    }
    data["instances"].append(instance)
    data["activeId"] = instance["id"]
    _save(data)
    instance_dir(instance["id"])
    return instance


def set_active_instance(instance_id: str) -> None:
    data = _load()
    data["activeId"] = instance_id
    _save(data)


def remove_instance(instance_id: str) -> None:
    """Unregisters the instance from this tool only - it never touches the
    actual server folder on disk, since that may contain real world saves."""
    data = _load()
    data["instances"] = [i for i in data["instances"] if i["id"] != instance_id]
    if data["activeId"] == instance_id:
        data["activeId"] = data["instances"][0]["id"] if data["instances"] else None
    _save(data)


def rename_instance(instance_id: str, name: str) -> None:
    data = _load()
    for i in data["instances"]:
        if i["id"] == instance_id:
            i["name"] = name
    _save(data)


def update_game_port(instance_id: str, game_port: int) -> None:
    """Keeps the stored gamePort in sync with whatever's actually live in the
    instance's ini - that file is the real source of truth once it exists
    (see palworld_settings.enforce_game_port/effective_game_port); this is
    just so the stored value doesn't silently go stale for display purposes
    (instance list, Server Control) or as the fallback for instances that
    don't have a PublicPort field yet."""
    data = _load()
    for i in data["instances"]:
        if i["id"] == instance_id:
            i["gamePort"] = game_port
    _save(data)


def update_community_server(instance_id: str, enabled: bool) -> dict[str, Any] | None:
    data = _load()
    updated = None
    for instance in data["instances"]:
        if instance["id"] == instance_id:
            instance["communityServer"] = enabled
            updated = instance
            break
    if updated:
        _save(data)
    return updated


def list_view() -> dict[str, Any]:
    return {"activeId": get_active_id(), "instances": list_instances()}


def migrate_legacy_single_instance() -> None:
    """One-time upgrade path: before multi-instance support, this tool tracked
    a single global server folder in data/local_config.json plus top-level
    data/mods.json and data/ue4ss.json. If those still exist and no instance
    registry has been created yet, fold them into the first registered
    instance so existing setups aren't wiped out by the upgrade.
    """
    if (DATA_DIR / f"{_STORE_NAME}.json").exists():
        return

    legacy_config_path = DATA_DIR / "local_config.json"
    if not legacy_config_path.is_file():
        return

    try:
        legacy = json.loads(legacy_config_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return

    server_path = legacy.get("serverPath")
    if not server_path:
        return

    instance = create_instance(
        name="My Palworld Server",
        server_path=server_path,
        source=legacy.get("serverPathSource") or "manual",
    )
    target_dir = instance_dir(instance["id"])

    mods_override = legacy.get("modsPathOverride")
    if mods_override:
        (target_dir / "config.json").write_text(
            json.dumps({"modsPathOverride": mods_override}, indent=2), encoding="utf-8"
        )

    for legacy_name, new_name in (("mods.json", "mods.json"), ("ue4ss.json", "ue4ss.json")):
        legacy_path = DATA_DIR / legacy_name
        if legacy_path.is_file():
            shutil.move(str(legacy_path), str(target_dir / new_name))

    legacy_config_path.rename(DATA_DIR / "local_config.json.migrated")
