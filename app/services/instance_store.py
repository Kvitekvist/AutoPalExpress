"""Registry of managed Palworld server instances. Each instance is a fully
independent PalServer install (its own folder, own Mods, own UE4SS install,
own ports) so multiple servers can run on one machine without their mods or
config colliding. Exactly one instance is "active" at a time - the existing
mods/UE4SS/etc. endpoints all operate on whichever instance is active, so
switching instances is what changes what those endpoints act on.
"""

import json
import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Any

from app import storage
from app.paths import data_dir
from app.services import palworld_settings

_STORE_NAME = "instances"

DATA_DIR = data_dir()
INSTANCES_DIR = DATA_DIR / "instances"
INSTANCES_DIR.mkdir(parents=True, exist_ok=True)


def _load() -> dict[str, Any]:
    return storage.load(_STORE_NAME, {"activeId": None, "instances": []})


def _save(data: dict[str, Any]) -> None:
    storage.save(_STORE_NAME, data)


def _server_path_key(server_path: str) -> str:
    try:
        return os.path.normcase(os.path.normpath(str(Path(server_path).resolve())))
    except OSError:
        return os.path.normcase(os.path.normpath(str(Path(server_path))))


def _canonical_server_path(server_path: str) -> str:
    try:
        return str(Path(server_path).resolve())
    except OSError:
        return str(Path(server_path))


def _dedupe_data(data: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    active_id = data.get("activeId")
    instances = data.get("instances", [])
    by_path: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    changed = False

    for instance in instances:
        key = _server_path_key(instance.get("serverPath", ""))
        canonical_path = _canonical_server_path(instance.get("serverPath", ""))
        if instance.get("serverPath") != canonical_path:
            instance["serverPath"] = canonical_path
            changed = True
        if "usePerfThreads" not in instance:
            instance["usePerfThreads"] = bool(instance.get("performanceFlags", True))
            changed = True
        if "noAsyncLoadingThread" not in instance:
            instance["noAsyncLoadingThread"] = bool(instance.get("performanceFlags", True))
            changed = True
        if "useMultithreadForDs" not in instance:
            instance["useMultithreadForDs"] = bool(instance.get("performanceFlags", True))
            changed = True
        if "usePublicIpOverride" not in instance:
            instance["usePublicIpOverride"] = False
            changed = True
        if "usePublicPortOverride" not in instance:
            instance["usePublicPortOverride"] = False
            changed = True
        existing = by_path.get(key)
        if not existing:
            by_path[key] = instance
            order.append(key)
            continue

        changed = True
        if instance.get("id") == active_id or (
            existing.get("id") != active_id and instance.get("createdAt", 0) < existing.get("createdAt", 0)
        ):
            by_path[key] = instance

    deduped = [by_path[key] for key in order]
    if len(deduped) != len(instances):
        changed = True

    valid_ids = {instance["id"] for instance in deduped}
    if active_id not in valid_ids:
        data["activeId"] = deduped[0]["id"] if deduped else None
        changed = True

    data["instances"] = deduped
    return data, changed


def _load_clean() -> dict[str, Any]:
    data, changed = _dedupe_data(_load())
    if changed:
        _save(data)
    return data


def list_instances() -> list[dict[str, Any]]:
    return _load_clean()["instances"]


def get_active_id() -> str | None:
    return _load_clean()["activeId"]


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
    data = _load_clean()
    canonical_path = _canonical_server_path(server_path)
    path_key = _server_path_key(canonical_path)
    for existing in data["instances"]:
        if _server_path_key(existing["serverPath"]) == path_key:
            data["activeId"] = existing["id"]
            existing["name"] = existing.get("name") or name
            _save(data)
            return existing

    instance = {
        "id": f"srv-{uuid.uuid4().hex[:10]}",
        "name": name,
        "serverPath": canonical_path,
        "source": source,  # "deployed" | "steam" | "manual"
        "gamePort": game_port,
        "rconPort": rcon_port,
        "communityServer": False,
        "performanceFlags": True,
        "usePerfThreads": True,
        "noAsyncLoadingThread": True,
        "useMultithreadForDs": True,
        "usePublicIpOverride": False,
        "usePublicPortOverride": False,
        "workerThreads": None,
        "jsonLogFormat": False,
        "createdAt": time.time(),
    }
    data["instances"].append(instance)
    data["activeId"] = instance["id"]
    _save(data)
    instance_dir(instance["id"])
    return instance


def set_active_instance(instance_id: str) -> None:
    data = _load_clean()
    data["activeId"] = instance_id
    _save(data)


def remove_instance(instance_id: str, *, delete_server_files: bool = False) -> None:
    """Unregisters the instance from this tool only - it never touches the
    actual server folder on disk unless the caller explicitly asks for the
    destructive delete-server-files path."""
    data = _load_clean()
    instance = next((i for i in data["instances"] if i["id"] == instance_id), None)
    data["instances"] = [i for i in data["instances"] if i["id"] != instance_id]
    if data["activeId"] == instance_id:
        data["activeId"] = data["instances"][0]["id"] if data["instances"] else None
    _save(data)
    if delete_server_files and instance:
        server_path = Path(instance["serverPath"])
        if server_path.exists():
            shutil.rmtree(server_path)


def rename_instance(instance_id: str, name: str) -> None:
    data = _load_clean()
    for i in data["instances"]:
        if i["id"] == instance_id:
            i["name"] = name
    _save(data)


def update_game_port(instance_id: str, game_port: int) -> None:
    """Stores the Super Admin-owned game port for display, reinstall/update
    memory, and as the launch-time port once the host has chosen a custom
    value."""
    data = _load_clean()
    for i in data["instances"]:
        if i["id"] == instance_id:
            i["gamePort"] = game_port
    _save(data)


def resolve_game_port(instance: dict[str, Any]) -> int:
    """Returns the port AutoPalExpress should treat as authoritative.

    Existing installs can have an old default stored in instances.json while a
    live PalWorldSettings.ini has the real custom port. Once the super admin has
    saved a custom port into the instance record, that remembered value wins so
    reinstall/update does not drift back to 8211.
    """
    stored_port = int(instance.get("gamePort") or 8211)
    ini_port = palworld_settings.read_public_port(Path(instance["serverPath"]))
    if stored_port == 8211 and ini_port and ini_port != stored_port:
        update_game_port(instance["id"], ini_port)
        return ini_port
    return stored_port or ini_port or 8211


def update_community_server(instance_id: str, enabled: bool) -> dict[str, Any] | None:
    data = _load_clean()
    updated = None
    for instance in data["instances"]:
        if instance["id"] == instance_id:
            instance["communityServer"] = enabled
            updated = instance
            break
    if updated:
        _save(data)
    return updated


def update_launch_options(
    instance_id: str,
    *,
    use_perf_threads: bool,
    no_async_loading_thread: bool,
    use_multithread_for_ds: bool,
    public_lobby: bool,
    use_public_ip_override: bool,
    use_public_port_override: bool,
) -> dict[str, Any] | None:
    data = _load_clean()
    updated = None
    for instance in data["instances"]:
        if instance["id"] == instance_id:
            instance["usePerfThreads"] = use_perf_threads
            instance["noAsyncLoadingThread"] = no_async_loading_thread
            instance["useMultithreadForDs"] = use_multithread_for_ds
            instance["performanceFlags"] = use_perf_threads and no_async_loading_thread and use_multithread_for_ds
            instance["communityServer"] = public_lobby
            instance["usePublicIpOverride"] = use_public_ip_override
            instance["usePublicPortOverride"] = use_public_port_override
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
