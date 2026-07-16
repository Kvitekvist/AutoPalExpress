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
import tempfile
from collections import deque
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.services import backup_service, process_manager, safe_replace
from app.services.safe_replace import SafeReplaceError

logger = logging.getLogger("palworld_admin.save_import_service")

_SAVE_MARKER = "Level.sav"
_REQUIRED_SAVE_FILES = ("Level.sav", "LevelMeta.sav")

# Deep enough to reach a world save from any real Palworld folder a user
# might reasonably point the picker at, without needing to know which shape
# they have: <world>/ (0), <slot-or-steamid>/<world>/ (1),
# SaveGames/.../<world>/ (2), Saved/SaveGames/.../<world>/ (3),
# Pal/Saved/SaveGames/.../<world>/ (4 - the full relative path from a
# Palworld install or AppData root).
_MAX_SEARCH_DEPTH = 4
_MAX_DIRS_SCANNED = 20_000


class SaveImportError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _dest_slot_dir(instance: dict[str, Any]) -> Path:
    return Path(instance["serverPath"]) / "Pal" / "Saved" / "SaveGames" / "0"


def _is_world_save_folder(path: Path) -> bool:
    return path.is_dir() and (path / _SAVE_MARKER).is_file()


def _missing_or_empty_required_files(path: Path) -> list[str]:
    issues = []
    for filename in _REQUIRED_SAVE_FILES:
        file_path = path / filename
        if not file_path.is_file():
            issues.append(f"missing {filename}")
        elif file_path.stat().st_size == 0:
            issues.append(f"{filename} is empty")
    return issues


def _candidate(path: Path) -> dict[str, Any]:
    stat = path.stat()
    issues = _missing_or_empty_required_files(path)
    return {
        "path": str(path),
        "name": path.name,
        "sizeBytes": sum(f.stat().st_size for f in path.rglob("*") if f.is_file()),
        "modified": datetime.fromtimestamp(stat.st_mtime, tz=UTC).isoformat(),
        "valid": not issues,
        "issues": issues,
    }


def _find_world_saves(root: Path, max_depth: int = _MAX_SEARCH_DEPTH) -> list[Path]:
    """Breadth-first search for world-save folders (anything directly
    containing Level.sav) at or under `root`, up to `max_depth` levels down.
    Doesn't descend into a folder once it's identified as a world save
    itself (its own subfolders, e.g. Players/, are never further worlds).
    Raises SaveImportError instead of scanning indefinitely if `root`
    contains far more subfolders than any real save folder ever would (e.g.
    someone picked a whole drive by mistake)."""
    found: list[Path] = []
    frontier: deque[tuple[Path, int]] = deque([(root, 0)])
    scanned = 0

    while frontier:
        current, depth = frontier.popleft()
        if _is_world_save_folder(current):
            found.append(current)
            continue
        if depth >= max_depth:
            continue
        try:
            children = [c for c in current.iterdir() if c.is_dir()]
        except OSError:
            continue
        scanned += len(children)
        if scanned > _MAX_DIRS_SCANNED:
            raise SaveImportError(
                "That folder has too many subfolders to search automatically - pick a more specific folder "
                "(e.g. the world's own save folder, or its SaveGames parent)."
            )
        frontier.extend((child, depth + 1) for child in children)

    return found


def inspect_source(path: str) -> list[dict[str, Any]]:
    """Returns candidate world-save folders found at or under `path`, up to
    `_MAX_SEARCH_DEPTH` folders deep - covers every real Palworld save
    layout (the world folder itself, its SteamID/slot parent, SaveGames,
    Saved, or the whole Pal folder) automatically."""
    root = Path(path)
    if not root.is_dir():
        raise SaveImportError(f"'{path}' is not a folder that exists on this machine.")

    candidates = _find_world_saves(root)
    if not candidates:
        raise SaveImportError(
            f"No Palworld world save was found in or under '{path}' (looked up to {_MAX_SEARCH_DEPTH} folders "
            "deep). Pick the world's own save folder (it contains Level.sav), or a parent folder like SaveGames."
        )
    return [_candidate(c) for c in sorted(candidates)]


def inspect_destination(instance: dict[str, Any]) -> dict[str, Any] | None:
    """Describes whatever world save currently occupies this server's
    active save slot, so the UI can show it side by side with the source
    about to replace it. Returns None if the slot is empty or missing."""
    dest_slot = _dest_slot_dir(instance)
    if not dest_slot.is_dir():
        return None
    worlds = [child for child in dest_slot.iterdir() if _is_world_save_folder(child)]
    if not worlds:
        return None
    # A dedicated server's slot holds exactly one active world - if
    # somehow more than one sits there, show the most recently modified.
    current = max(worlds, key=lambda w: w.stat().st_mtime)
    return _candidate(current)


def _validate_world_save_folder(path: Path) -> None:
    if not _is_world_save_folder(path):
        raise SaveImportError(f"'{path}' is not a Palworld world save folder (no {_SAVE_MARKER} found).")
    issues = _missing_or_empty_required_files(path)
    if issues:
        raise SaveImportError(f"'{path.name}' looks incomplete: {', '.join(issues)}.")


def _replace_slot_with_world(source: Path, dest_slot: Path) -> None:
    """dest_slot (e.g. SaveGames/0) should end up containing exactly one
    world folder, replacing whatever was there before - not just adding
    source alongside any existing sibling. safe_replace_dir() makes dest an
    exact copy of whatever's passed as its source, so `source` (the world
    folder itself) is first staged one level deeper, under a throwaway
    parent, matching the nesting dest_slot actually needs
    (dest_slot/<world_name>/...). The throwaway staging copy is a plain,
    unverified copytree into a system temp dir - safe to skip verifying,
    since it never touches the live dest_slot; safe_replace_dir's own
    copy-verify-swap is what actually protects the live folder."""
    with tempfile.TemporaryDirectory() as tmp:
        staging_parent = Path(tmp) / "slot"
        shutil.copytree(source, staging_parent / source.name)
        safe_replace.safe_replace_dir(staging_parent, dest_slot)


async def import_save(instance: dict[str, Any], source_path: str) -> dict[str, Any]:
    source = Path(source_path)
    _validate_world_save_folder(source)

    status = process_manager.get_status(instance["id"])
    if status["state"] != "offline":
        raise SaveImportError("Stop this server before importing a save over its current one.")

    backup_record = await backup_service.backup_before_import(instance)
    dest_slot = _dest_slot_dir(instance)

    try:
        await asyncio.to_thread(_replace_slot_with_world, source, dest_slot)
    except SafeReplaceError as e:
        restored = False
        if backup_record:
            backup_slot = Path(backup_record["folder"]) / "SaveGames" / dest_slot.name
            if backup_slot.is_dir():
                try:
                    await asyncio.to_thread(safe_replace.safe_replace_dir, backup_slot, dest_slot)
                    restored = True
                except SafeReplaceError:
                    restored = False
        if restored:
            raise SaveImportError(
                f"Importing '{source.name}' failed and was rolled back automatically - your server's "
                f"previous save has been restored. ({e.message})"
            ) from e
        raise SaveImportError(
            f"Importing '{source.name}' failed: {e.message}. "
            + (
                "Your previous save should still be recoverable from the backup taken just before this "
                "import (see Recent Backups)."
                if backup_record
                else ""
            )
        ) from e

    logger.info("save_import_service: imported %s -> %s for %s", source, dest_slot, instance["name"])
    return {
        "importedFrom": str(source),
        "worldName": source.name,
        "backupCreated": backup_record is not None,
    }
