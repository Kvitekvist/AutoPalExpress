"""Imports a Palworld world save (e.g. a co-op save copied over from a
client PC's Steam save folder) into a registered server's save slot.

A dedicated server's save lives at Pal/Saved/SaveGames/0/<WorldGUID>/, while
a client's saves live at Pal/Saved/SaveGames/<SteamID>/<WorldGUID>/ - the "0"
is just the dedicated-server slot name, not a Steam id, so the server
machine never needs Steam installed for this to work.
"""

import asyncio
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.services import backup_service, process_manager

logger = logging.getLogger("palworld_admin.save_import_service")

_SAVE_MARKER = "Level.sav"


class SaveImportError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _dest_slot_dir(instance: dict[str, Any]) -> Path:
    return Path(instance["serverPath"]) / "Pal" / "Saved" / "SaveGames" / "0"


def _is_world_save_folder(path: Path) -> bool:
    return path.is_dir() and (path / _SAVE_MARKER).is_file()


def _candidate(path: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "path": str(path),
        "name": path.name,
        "sizeBytes": sum(f.stat().st_size for f in path.rglob("*") if f.is_file()),
        "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
    }


def inspect_source(path: str) -> list[dict[str, Any]]:
    """Returns candidate world-save folders found at or one level under `path`."""
    root = Path(path)
    if not root.is_dir():
        raise SaveImportError(f"'{path}' is not a folder that exists on this machine.")

    if _is_world_save_folder(root):
        return [_candidate(root)]

    candidates = [_candidate(child) for child in sorted(root.iterdir()) if _is_world_save_folder(child)]
    if not candidates:
        raise SaveImportError(
            f"No Palworld world save was found in '{path}'. Pick the world's own save folder "
            "(it contains Level.sav) or its parent folder."
        )
    return candidates


def _clear_and_copy(source: Path, dest_slot: Path) -> None:
    if dest_slot.exists():
        shutil.rmtree(dest_slot)
    dest_slot.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, dest_slot / source.name)


async def import_save(instance: dict[str, Any], source_path: str) -> dict[str, Any]:
    source = Path(source_path)
    if not _is_world_save_folder(source):
        raise SaveImportError(f"'{source_path}' is not a Palworld world save folder (no {_SAVE_MARKER} found).")

    status = process_manager.get_status(instance["id"])
    if status["state"] != "offline":
        raise SaveImportError("Stop this server before importing a save over its current one.")

    backup_record = await backup_service.backup_before_import(instance)

    dest_slot = _dest_slot_dir(instance)
    await asyncio.to_thread(_clear_and_copy, source, dest_slot)

    logger.info("save_import_service: imported %s -> %s for %s", source, dest_slot, instance["name"])
    return {
        "importedFrom": str(source),
        "worldName": source.name,
        "backupCreated": backup_record is not None,
    }
