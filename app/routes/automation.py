import asyncio
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.services import (
    automation_store,
    backup_service,
    instance_store,
    native_dialog,
    palworld_rest,
    save_import_service,
)
from app.services.backup_service import BackupError
from app.services.save_import_service import SaveImportError

router = APIRouter()


def _require_active_instance() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        raise HTTPException(status_code=400, detail="No server selected. Create or import one in Settings.")
    return instance


def _rest_ready(instance: dict[str, Any]) -> bool:
    return palworld_rest.is_ready(instance)


@router.get("")
async def get_automation() -> dict[str, Any]:
    instance = _require_active_instance()
    config = automation_store.load(instance["id"])
    return {**config, "rconReady": _rest_ready(instance)}


class ScheduleModel(BaseModel):
    enabled: bool
    frequency: str
    dayOfWeek: int
    hour: int


class RestartScheduleModel(ScheduleModel):
    warningMinutes: int


class BackupRetentionModel(BaseModel):
    maxCount: int | None = None
    maxAgeDays: int | None = None
    maxTotalBytes: int | None = None


class AutomationConfigRequest(BaseModel):
    backup: ScheduleModel
    restart: RestartScheduleModel
    joinLeaveMessages: bool
    backupRetention: BackupRetentionModel = BackupRetentionModel()


def _validate_schedule(schedule: ScheduleModel) -> None:
    if schedule.frequency not in ("daily", "weekly"):
        raise HTTPException(status_code=400, detail="frequency must be 'daily' or 'weekly'.")
    if not 0 <= schedule.hour <= 23:
        raise HTTPException(status_code=400, detail="hour must be between 0 and 23.")
    if not 0 <= schedule.dayOfWeek <= 6:
        raise HTTPException(status_code=400, detail="dayOfWeek must be between 0 and 6.")


def _validate_retention(retention: BackupRetentionModel) -> None:
    if retention.maxCount is not None and retention.maxCount < 1:
        raise HTTPException(status_code=400, detail="maxCount must be at least 1, or left unset for unlimited.")
    if retention.maxAgeDays is not None and retention.maxAgeDays < 1:
        raise HTTPException(status_code=400, detail="maxAgeDays must be at least 1, or left unset for unlimited.")
    if retention.maxTotalBytes is not None and retention.maxTotalBytes < 1:
        raise HTTPException(status_code=400, detail="maxTotalBytes must be at least 1, or left unset for unlimited.")


@router.post("")
async def update_automation(body: AutomationConfigRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    _validate_schedule(body.backup)
    _validate_schedule(body.restart)
    if body.restart.warningMinutes < 0:
        raise HTTPException(status_code=400, detail="warningMinutes cannot be negative.")
    _validate_retention(body.backupRetention)

    config = {
        "backup": body.backup.model_dump(),
        "restart": body.restart.model_dump(),
        "joinLeaveMessages": body.joinLeaveMessages,
        "backupRetention": body.backupRetention.model_dump(),
    }
    automation_store.save(instance["id"], config)
    return {**config, "rconReady": _rest_ready(instance)}


@router.get("/backups")
async def list_backups() -> list[dict[str, Any]]:
    instance = _require_active_instance()
    return backup_service.list_backups(instance["id"])


@router.post("/backups/run")
async def run_backup_now() -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        return await backup_service.run_backup(instance)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/backups/{timestamp}/open")
async def open_backup_folder(timestamp: str) -> dict[str, Any]:
    """Opens a specific backup's folder in Explorer - added after user
    feedback that finding where a backup actually lives on disk (to restore
    it manually) required hunting through the data folder by hand."""
    instance = _require_active_instance()
    match = next((b for b in backup_service.list_backups(instance["id"]) if b["timestamp"] == timestamp), None)
    if not match:
        raise HTTPException(status_code=404, detail="No such backup.")
    folder = Path(match["folder"])
    if not folder.is_dir():
        raise HTTPException(status_code=400, detail=f"'{folder}' no longer exists on this machine.")
    try:
        os.startfile(str(folder))  # type: ignore[attr-defined]
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not open the backup folder: {e}")
    return {"opened": True}


@router.post("/backups/{timestamp}/verify")
async def verify_backup(timestamp: str) -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        return await asyncio.to_thread(backup_service.verify_backup, instance["id"], timestamp)
    except BackupError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.post("/backups/{timestamp}/restore")
async def restore_backup(timestamp: str) -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        return await backup_service.restore_backup(instance, timestamp)
    except BackupError as e:
        raise HTTPException(status_code=400, detail=e.message)


class BackupNotesRequest(BaseModel):
    notes: str


@router.patch("/backups/{timestamp}/notes")
async def set_backup_notes(timestamp: str, body: BackupNotesRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        return await asyncio.to_thread(backup_service.set_backup_notes, instance["id"], timestamp, body.notes)
    except BackupError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.get("/backups/{timestamp}/export")
async def export_backup(timestamp: str, background_tasks: BackgroundTasks) -> FileResponse:
    instance = _require_active_instance()
    try:
        zip_path = await asyncio.to_thread(backup_service.export_backup_zip, instance["id"], timestamp)
    except BackupError as e:
        raise HTTPException(status_code=400, detail=e.message)
    background_tasks.add_task(zip_path.unlink, missing_ok=True)
    return FileResponse(zip_path, filename=f"{instance['name']}-{timestamp}.zip", media_type="application/zip")


@router.post("/save-import/browse")
async def browse_save_import() -> dict[str, Any]:
    path = await asyncio.to_thread(
        native_dialog.pick_folder, "Select the world save folder, or a parent folder like SaveGames or Saved"
    )
    return {"path": path}


class SaveImportPathRequest(BaseModel):
    path: str


@router.post("/save-import/inspect")
async def inspect_save_import(body: SaveImportPathRequest) -> dict[str, Any]:
    try:
        candidates = await asyncio.to_thread(save_import_service.inspect_source, body.path)
    except SaveImportError as e:
        raise HTTPException(status_code=400, detail=e.message)
    return {"candidates": candidates}


@router.get("/save-import/destination")
async def get_save_import_destination() -> dict[str, Any]:
    instance = _require_active_instance()
    current = await asyncio.to_thread(save_import_service.inspect_destination, instance)
    return {"current": current}


@router.post("/save-import/apply")
async def apply_save_import(body: SaveImportPathRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        return await save_import_service.import_save(instance, body.path)
    except SaveImportError as e:
        raise HTTPException(status_code=400, detail=e.message)
