import asyncio
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import automation_store, backup_service, instance_store, native_dialog, palworld_rest, save_import_service
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


class AutomationConfigRequest(BaseModel):
    backup: ScheduleModel
    restart: RestartScheduleModel
    joinLeaveMessages: bool


def _validate_schedule(schedule: ScheduleModel) -> None:
    if schedule.frequency not in ("daily", "weekly"):
        raise HTTPException(status_code=400, detail="frequency must be 'daily' or 'weekly'.")
    if not 0 <= schedule.hour <= 23:
        raise HTTPException(status_code=400, detail="hour must be between 0 and 23.")
    if not 0 <= schedule.dayOfWeek <= 6:
        raise HTTPException(status_code=400, detail="dayOfWeek must be between 0 and 6.")


@router.post("")
async def update_automation(body: AutomationConfigRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    _validate_schedule(body.backup)
    _validate_schedule(body.restart)
    if body.restart.warningMinutes < 0:
        raise HTTPException(status_code=400, detail="warningMinutes cannot be negative.")

    config = {
        "backup": body.backup.model_dump(),
        "restart": body.restart.model_dump(),
        "joinLeaveMessages": body.joinLeaveMessages,
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


@router.post("/save-import/browse")
async def browse_save_import() -> dict[str, Any]:
    path = await asyncio.to_thread(
        native_dialog.pick_folder, "Select the world save folder (or its parent SaveGames folder)"
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


@router.post("/save-import/apply")
async def apply_save_import(body: SaveImportPathRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        return await save_import_service.import_save(instance, body.path)
    except SaveImportError as e:
        raise HTTPException(status_code=400, detail=e.message)
