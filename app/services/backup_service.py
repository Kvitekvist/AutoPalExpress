"""Scheduled/manual world-save backups, verification, and restore. Backs up
the whole Pal/Saved/SaveGames folder (not just one save slot) to keep this
simple and robust rather than trying to guess which save ID is "the" active
one; restoring puts that same whole folder back.
"""

import asyncio
import json
import logging
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from app.services import activity_log, automation_store, instance_store, palworld_rest, process_manager, safe_replace
from app.services.palworld_rest import PalworldRestError
from app.services.safe_replace import SafeReplaceError

logger = logging.getLogger("palworld_admin.backup_service")


class BackupError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _save_games_dir(instance: dict[str, Any]) -> Path:
    return Path(instance["serverPath"]) / "Pal" / "Saved" / "SaveGames"


def _backups_dir(instance_id: str) -> Path:
    d = instance_store.instance_dir(instance_id) / "backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _dir_size(path: Path) -> int:
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file())


def _retention_config(instance_id: str) -> dict[str, Any]:
    return automation_store.load(instance_id).get("backupRetention", dict(automation_store.DEFAULT_BACKUP_RETENTION))


def _prune_old_backups(instance_id: str) -> None:
    """Applies whichever retention limits are configured (each independently
    optional/unlimited) - replaces the old fixed "keep the last 10"
    behavior. Oldest backups go first regardless of which limit is over."""
    retention = _retention_config(instance_id)
    backups = sorted((p for p in _backups_dir(instance_id).iterdir() if p.is_dir()), key=lambda p: p.name)

    max_age_days = retention.get("maxAgeDays")
    if max_age_days:
        cutoff = time.time() - max_age_days * 86400
        keep = []
        for backup in backups:
            if backup.stat().st_mtime < cutoff:
                shutil.rmtree(backup, ignore_errors=True)
            else:
                keep.append(backup)
        backups = keep

    max_count = retention.get("maxCount")
    if max_count:
        while len(backups) > max_count:
            shutil.rmtree(backups.pop(0), ignore_errors=True)

    max_total_bytes = retention.get("maxTotalBytes")
    if max_total_bytes:
        sizes = {backup: _dir_size(backup) for backup in backups}
        while backups and sum(sizes[b] for b in backups) > max_total_bytes:
            shutil.rmtree(backups.pop(0), ignore_errors=True)


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


async def _create_snapshot(instance: dict[str, Any], *, kind: str, live_save_forced: bool = False) -> dict[str, Any] | None:
    """Shared by every snapshot-taking path (manual/scheduled backups,
    pre-import, pre-restore) - copies the current SaveGames folder, records
    a file manifest (count + per-file size/sha256) in meta.json so
    verify_backup() has something real to check later, and applies
    retention. Returns None (nothing to copy) rather than raising, since a
    server that's never been started yet is an expected, non-exceptional
    state for the internal snapshot paths - callers that need to treat "no
    save data" as an error (run_backup) check for None themselves."""
    src = _save_games_dir(instance)
    if not src.is_dir():
        return None

    dest = await asyncio.to_thread(_unique_backup_dest, instance["id"], datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))
    await asyncio.to_thread(_copy_backup, src, dest)
    manifest = await asyncio.to_thread(safe_replace.build_manifest, dest)

    record = {
        "timestamp": dest.name,
        "kind": kind,
        "sizeBytes": await asyncio.to_thread(_dir_size, dest),
        "fileCount": len(manifest),
        "liveSaveForced": live_save_forced,
        "notes": "",
        "folder": str(dest),
    }
    (dest / "meta.json").write_text(json.dumps({**record, "manifest": manifest}, indent=2), encoding="utf-8")

    await asyncio.to_thread(_prune_old_backups, instance["id"])
    return record


async def run_backup(instance: dict[str, Any], *, kind: str = "manual") -> dict[str, Any]:
    src = _save_games_dir(instance)
    if not src.is_dir():
        raise FileNotFoundError(f"No save data found at {src} - has this server ever been started?")

    live_save_forced = False
    try:
        await palworld_rest.save(instance)
        await asyncio.sleep(2)  # give the save write a moment to land on disk before copying
        live_save_forced = True
        process_manager.record_save(instance["id"])
    except PalworldRestError as e:
        logger.info("backup_service: skipping live save before backup (%s)", e.message)

    record = await _create_snapshot(instance, kind=kind, live_save_forced=live_save_forced)
    if record is None:
        raise FileNotFoundError(f"No save data found at {src} - has this server ever been started?")

    logger.info("backup_service: backed up %s -> %s (live save forced: %s)", instance["name"], record["folder"], live_save_forced)
    return record


async def backup_before_import(instance: dict[str, Any]) -> dict[str, Any] | None:
    """Snapshots the current SaveGames folder before a save import overwrites it.
    Returns None when there is nothing on disk yet to snapshot."""
    record = await _create_snapshot(instance, kind="pre_import")
    if record:
        logger.info("backup_service: pre-import snapshot for %s -> %s", instance["name"], record["folder"])
    return record


def _load_meta(folder: Path) -> dict[str, Any] | None:
    meta_path = folder / "meta.json"
    if not meta_path.is_file():
        return None
    return json.loads(meta_path.read_text(encoding="utf-8"))


def _public_record(meta: dict[str, Any], folder: Path) -> dict[str, Any]:
    """meta.json's on-disk shape minus the (potentially large) manifest,
    with legacy fields backfilled for backups made before this ticket."""
    record = {k: v for k, v in meta.items() if k != "manifest"}
    record["folder"] = str(folder)
    record.setdefault("kind", "pre_import" if meta.get("preImport") else "manual")
    record.pop("preImport", None)
    record.setdefault("notes", "")
    record.setdefault("fileCount", None)
    record["hasManifest"] = bool(meta.get("manifest"))
    return record


def list_backups(instance_id: str) -> list[dict[str, Any]]:
    records = []
    for folder in sorted(_backups_dir(instance_id).iterdir(), reverse=True):
        meta = _load_meta(folder)
        if meta is not None:
            records.append(_public_record(meta, folder))
    return records


def _backup_folder(instance_id: str, timestamp: str) -> Path:
    folder = _backups_dir(instance_id) / timestamp
    if not folder.is_dir():
        raise BackupError(f"No such backup: '{timestamp}'.")
    return folder


def verify_backup(instance_id: str, timestamp: str) -> dict[str, Any]:
    """Re-checks a backup's real on-disk files against the manifest recorded
    when it was made. Three possible outcomes: "ok" (everything matches),
    "corrupted" (something's missing/changed), or "unknown" (this backup
    predates manifests existing at all, so there's nothing to check against)."""
    folder = _backup_folder(instance_id, timestamp)
    meta = _load_meta(folder)
    if meta is None:
        raise BackupError(f"Backup '{timestamp}' has no meta.json to verify against.")

    manifest = meta.get("manifest")
    if not manifest:
        return {"status": "unknown", "issues": ["This backup was made before integrity checks existed - nothing to verify against."]}

    issues = safe_replace.verify_manifest(folder, manifest)
    return {"status": "ok" if not issues else "corrupted", "issues": issues}


def set_backup_notes(instance_id: str, timestamp: str, notes: str) -> dict[str, Any]:
    folder = _backup_folder(instance_id, timestamp)
    meta = _load_meta(folder)
    if meta is None:
        raise BackupError(f"Backup '{timestamp}' has no meta.json to update.")
    meta["notes"] = notes
    (folder / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return _public_record(meta, folder)


def export_backup_zip(instance_id: str, timestamp: str) -> Path:
    """Zips a backup folder for download - overwrites any previous export of
    the same backup rather than accumulating one file per export click."""
    folder = _backup_folder(instance_id, timestamp)
    export_dir = instance_store.instance_dir(instance_id) / "backup_exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    archive_path = shutil.make_archive(str(export_dir / timestamp), "zip", root_dir=folder)
    return Path(archive_path)


async def restore_backup(instance: dict[str, Any], timestamp: str) -> dict[str, Any]:
    """One-click restore: verifies the backup first (refusing a corrupted
    one outright), stops the server if it's running, snapshots the current
    live save as a rollback point, then safely replaces the live SaveGames
    folder with the backup's contents - restoring from that rollback
    snapshot automatically if the replace itself fails for any reason."""
    folder = _backup_folder(instance["id"], timestamp)
    verification = verify_backup(instance["id"], timestamp)
    if verification["status"] == "corrupted":
        raise BackupError(
            f"Backup '{timestamp}' looks corrupted or incomplete and can't be restored automatically: "
            + "; ".join(verification["issues"])
        )

    backup_save_games = folder / "SaveGames"
    if not backup_save_games.is_dir():
        raise BackupError(f"Backup '{timestamp}' has no save data to restore.")

    server_was_stopped = False
    status = process_manager.get_status(instance["id"])
    if status["state"] != "offline":
        await asyncio.to_thread(process_manager.stop, instance["id"])
        server_was_stopped = True

    rollback_record = await _create_snapshot(instance, kind="pre_restore")
    live_save_games = _save_games_dir(instance)

    try:
        await asyncio.to_thread(safe_replace.safe_replace_dir, backup_save_games, live_save_games)
    except SafeReplaceError as e:
        restored = False
        if rollback_record:
            rollback_save_games = Path(rollback_record["folder"]) / "SaveGames"
            try:
                await asyncio.to_thread(safe_replace.safe_replace_dir, rollback_save_games, live_save_games)
                restored = True
            except SafeReplaceError:
                restored = False
        if restored:
            raise BackupError(
                f"Restoring '{timestamp}' failed and was rolled back automatically - your server's "
                f"previous save has been restored. ({e.message})"
            ) from e
        raise BackupError(
            f"Restoring '{timestamp}' failed: {e.message}. "
            + (
                "Your previous save should still be recoverable from the rollback snapshot taken just "
                "before this restore (see Recent Backups)."
                if rollback_record
                else ""
            )
        ) from e

    activity_log.log("warning", instance["name"], f"Restored save backup from {timestamp}.")
    logger.info("backup_service: restored backup %s -> %s for %s", timestamp, live_save_games, instance["name"])
    return {
        "restoredFrom": timestamp,
        "serverWasStopped": server_was_stopped,
        "rollbackSnapshot": rollback_record["timestamp"] if rollback_record else None,
    }
