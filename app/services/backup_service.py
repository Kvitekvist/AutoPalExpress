"""Scheduled/manual world-save backups. Copies the whole Pal/Saved/SaveGames
folder (not just one save slot) to keep this simple and robust rather than
trying to guess which save ID is "the" active one.
"""

import asyncio
import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from app.services import instance_store, palworld_rest
from app.services.palworld_rest import PalworldRestError

logger = logging.getLogger("palworld_admin.backup_service")

MAX_BACKUPS = 10


def _save_games_dir(instance: dict[str, Any]) -> Path:
    return Path(instance["serverPath"]) / "Pal" / "Saved" / "SaveGames"


def _backups_dir(instance_id: str) -> Path:
    d = instance_store.instance_dir(instance_id) / "backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _dir_size(path: Path) -> int:
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file())


def _prune_old_backups(instance_id: str) -> None:
    backups = sorted(p for p in _backups_dir(instance_id).iterdir() if p.is_dir())
    for old in backups[:-MAX_BACKUPS]:
        shutil.rmtree(old, ignore_errors=True)


def _copy_backup(src: Path, dest: Path) -> None:
    shutil.copytree(src, dest / "SaveGames")


def _unique_backup_dest(instance_id: str, timestamp: str) -> Path:
    """Two backups (e.g. a manual Backup Now right after a scheduled one, or
    a pre-import snapshot from two quick imports in a row) can land in the
    same second - fall back to a numbered suffix instead of colliding."""
    base = _backups_dir(instance_id)
    dest = base / timestamp
    suffix = 2
    while dest.exists():
        dest = base / f"{timestamp}-{suffix}"
        suffix += 1
    return dest


async def run_backup(instance: dict[str, Any]) -> dict[str, Any]:
    src = _save_games_dir(instance)
    if not src.is_dir():
        raise FileNotFoundError(f"No save data found at {src} - has this server ever been started?")

    live_save_forced = False
    try:
        await palworld_rest.save(instance)
        await asyncio.sleep(2)  # give the save write a moment to land on disk before copying
        live_save_forced = True
    except PalworldRestError as e:
        logger.info("backup_service: skipping live save before backup (%s)", e.message)

    dest = await asyncio.to_thread(_unique_backup_dest, instance["id"], datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))
    await asyncio.to_thread(_copy_backup, src, dest)

    record = {
        "timestamp": dest.name,
        "sizeBytes": await asyncio.to_thread(_dir_size, dest),
        "liveSaveForced": live_save_forced,
    }
    (dest / "meta.json").write_text(json.dumps(record), encoding="utf-8")

    await asyncio.to_thread(_prune_old_backups, instance["id"])
    logger.info("backup_service: backed up %s -> %s (live save forced: %s)", instance["name"], dest, live_save_forced)
    return record


async def backup_before_import(instance: dict[str, Any]) -> dict[str, Any] | None:
    """Snapshots the current SaveGames folder before a save import overwrites it.
    Returns None when there is nothing on disk yet to snapshot."""
    src = _save_games_dir(instance)
    if not src.is_dir():
        return None

    dest = await asyncio.to_thread(_unique_backup_dest, instance["id"], datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))
    await asyncio.to_thread(_copy_backup, src, dest)

    record = {
        "timestamp": dest.name,
        "sizeBytes": await asyncio.to_thread(_dir_size, dest),
        "liveSaveForced": False,
        "preImport": True,
    }
    (dest / "meta.json").write_text(json.dumps(record), encoding="utf-8")

    await asyncio.to_thread(_prune_old_backups, instance["id"])
    logger.info("backup_service: pre-import snapshot for %s -> %s", instance["name"], dest)
    return record


def list_backups(instance_id: str) -> list[dict[str, Any]]:
    records = []
    for folder in sorted(_backups_dir(instance_id).iterdir(), reverse=True):
        meta_path = folder / "meta.json"
        if meta_path.is_file():
            records.append(json.loads(meta_path.read_text(encoding="utf-8")))
    return records
