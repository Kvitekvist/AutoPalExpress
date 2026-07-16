"""Small helpers shared by the mod route/service split (app/routes/mods/*,
nexus_mod_service.py, manual_mod_service.py). Kept in the services layer -
not app/routes/mods/_shared.py - so both route handlers and the install
services can depend on them without services importing from routes."""

import logging
from pathlib import Path
from typing import Any

from app.services import local_config, mod_installer, mods_store, ue4ss_installer

logger = logging.getLogger("palworld_admin.mods")


def base_path_for_kind(instance: dict[str, Any], kind: str) -> str | None:
    """Pak mods (raw .pak, mounted directly by the game) and UE4SS mods (Lua/
    Blueprint, including PalSchema) live in different folders (TICKET-0143) -
    this picks the right one for a given mod's recorded/detected kind."""
    if kind == "pak":
        return local_config.get_pak_mods_path(instance)
    return local_config.get_mods_path(instance)


def mods_path_view(instance: dict[str, Any]) -> dict[str, Any]:
    info = local_config.get_mods_path_info(instance)
    path = info["path"]
    return {"modsPath": path, "source": info["source"], "exists": bool(path and Path(path).is_dir())}


def register_untracked_disk_mods(instance: dict[str, Any], mods: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Finds mod folders sitting directly in the UE4SS or pak mods folders
    that were never installed through this app (dropped in by hand) and
    registers them as normal tracked mods with `manuallyInstalled: True`, so
    they actually show up on the Mods page and can be enabled/disabled/
    removed like any other mod instead of being invisible to the app
    forever (TICKET-0146). Persists immediately so this is a one-time
    discovery, not a re-scan-and-re-add on every page load."""
    tracked_names = {m["folderName"] for m in mods if m.get("folderName")}
    discovered: list[dict[str, str]] = []

    ue4ss_path = local_config.get_mods_path(instance)
    if ue4ss_path:
        builtin = ue4ss_installer.builtin_mod_names(instance["id"])
        for name in mod_installer.list_untracked_entries(Path(ue4ss_path), tracked_names, builtin):
            discovered.append({"name": name, "installKind": "ue4ss"})

    pak_path = local_config.get_pak_mods_path(instance)
    for name in mod_installer.list_untracked_entries(Path(pak_path), tracked_names):
        discovered.append({"name": name, "installKind": "pak"})

    if not discovered:
        return mods

    for i, d in enumerate(discovered):
        mods.append(
            {
                "id": mods_store.new_id("manual"),
                "name": d["name"],
                "version": "Unknown",
                "author": "Unknown",
                "description": "",
                "dependencies": [],
                "status": "enabled",
                "loadPriority": len(mods) + i + 1,
                "updateAvailable": False,
                "sourceModId": None,
                "folderName": d["name"],
                "installKind": d["installKind"],
                "manuallyInstalled": True,
            }
        )
    mods_store.save_mods(instance["id"], mods)
    logger.info("mods: registered %d manually-installed mod(s) found on disk", len(discovered))
    return mods
