import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import psutil
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import instance_store, mods_store, palworld_rest, palworld_settings, process_manager
from app.services.process_manager import ProcessError
from app.services.palworld_rest import PalworldRestError

logger = logging.getLogger("palworld_admin.server_control")

router = APIRouter()

# Countdown timers are implemented as our own cancellable asyncio tasks so the
# app can still cancel before the final shutdown call is sent.
_countdown_tasks: dict[str, asyncio.Task] = {}

_OFFLINE_STATUS: dict[str, Any] = {
    "state": "offline",
    "map": "",
    "uptimeSeconds": 0,
    "cpuPercent": 0,
    "ramUsedGB": 0,
    "ramTotalGB": 0,
    "tickRateMs": 0,
    "targetTickRateMs": 0,
    "playersOnline": 0,
    "maxPlayers": 0,
    "serverVersion": "",
    "modCount": 0,
    "lastSavedAt": "",
}


def _require_active_instance() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        raise HTTPException(status_code=400, detail="No server selected. Create or import one in Settings.")
    return instance


def _status_view(instance: dict[str, Any] | None) -> dict[str, Any]:
    if not instance:
        return dict(_OFFLINE_STATUS)

    stats = process_manager.get_status(instance["id"])
    max_players = palworld_settings.read_max_players(Path(instance["serverPath"])) or 32
    mod_count = len(mods_store.load_mods(instance["id"]))

    return {
        **_OFFLINE_STATUS,
        "state": stats["state"],
        "uptimeSeconds": stats["uptimeSeconds"],
        "cpuPercent": stats["cpuPercent"],
        "ramUsedGB": stats["ramUsedGB"],
        "ramTotalGB": round(psutil.virtual_memory().total / (1024**3), 1),
        "maxPlayers": max_players,
        "modCount": mod_count,
    }


async def _status_view_async(instance: dict[str, Any] | None) -> dict[str, Any]:
    view = await asyncio.to_thread(_status_view, instance)
    if not instance or view["state"] not in ("online", "starting"):
        return view
    try:
        metrics, info = await asyncio.gather(palworld_rest.metrics(instance), palworld_rest.info(instance))
    except PalworldRestError as e:
        logger.info("status: REST metrics skipped for %s (%s)", instance["name"], e.message)
        return view
    return {
        **view,
        "tickRateMs": metrics.get("serverframetime") or view["tickRateMs"],
        "playersOnline": metrics.get("currentplayernum") or 0,
        "maxPlayers": metrics.get("maxplayernum") or view["maxPlayers"],
        "serverVersion": info.get("version") or view["serverVersion"],
        "uptimeSeconds": metrics.get("uptime") or view["uptimeSeconds"],
    }


@router.get("/status")
async def get_status() -> dict[str, Any]:
    instance = instance_store.get_active()
    return await _status_view_async(instance)


@router.post("/start")
async def start_server() -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        await asyncio.to_thread(process_manager.start, instance)
    except ProcessError as e:
        raise HTTPException(status_code=400, detail=e.message)
    return await _status_view_async(instance)


@router.post("/stop")
async def stop_server() -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        await palworld_rest.shutdown(instance, 1, "Server stopping.")
        await asyncio.sleep(3)
    except PalworldRestError as e:
        logger.info("stop: REST shutdown skipped for %s (%s)", instance["name"], e.message)
    await asyncio.to_thread(process_manager.stop, instance["id"])
    return await _status_view_async(instance)


@router.post("/restart")
async def restart_server() -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        await palworld_rest.shutdown(instance, 1, "Server restarting.")
        await asyncio.sleep(3)
    except PalworldRestError as e:
        logger.info("restart: REST shutdown skipped for %s (%s)", instance["name"], e.message)
    await asyncio.to_thread(process_manager.stop, instance["id"])
    try:
        await asyncio.to_thread(process_manager.start, instance)
    except ProcessError as e:
        raise HTTPException(status_code=400, detail=e.message)
    return await _status_view_async(instance)


@router.post("/save")
async def save_world() -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        await palworld_rest.save(instance)
    except PalworldRestError as e:
        raise HTTPException(status_code=400, detail=e.message)
    return {"savedAt": datetime.now().isoformat()}


class BroadcastRequest(BaseModel):
    message: str


@router.post("/broadcast")
async def broadcast_message(body: BroadcastRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        await palworld_rest.announce(instance, body.message)
    except PalworldRestError as e:
        raise HTTPException(status_code=400, detail=e.message)
    return {"message": body.message}


async def _try_broadcast(instance: dict[str, Any], message: str) -> None:
    try:
        await palworld_rest.announce(instance, message)
    except PalworldRestError as e:
        logger.info("shutdown countdown: broadcast skipped for %s (%s)", instance["name"], e.message)


async def _run_countdown(instance: dict[str, Any], seconds: int) -> None:
    try:
        await _try_broadcast(instance, f"The realm will fall silent in {seconds} seconds.")
        if seconds > 10:
            await asyncio.sleep(seconds - 10)
            await _try_broadcast(instance, "The realm will fall silent in 10 seconds.")
            await asyncio.sleep(10)
        else:
            await asyncio.sleep(seconds)
        await _try_broadcast(instance, "The realm falls silent now.")
        try:
            await palworld_rest.shutdown(instance, 1, "Server shutting down.")
            await asyncio.sleep(3)
        except PalworldRestError as e:
            logger.info("shutdown countdown: REST shutdown skipped for %s (%s)", instance["name"], e.message)
        await asyncio.to_thread(process_manager.stop, instance["id"])
    except asyncio.CancelledError:
        await _try_broadcast(instance, "The scheduled shutdown was cancelled.")
        raise
    finally:
        _countdown_tasks.pop(instance["id"], None)


class ShutdownCountdownRequest(BaseModel):
    seconds: int


@router.post("/shutdown-countdown")
async def start_shutdown_countdown(body: ShutdownCountdownRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    if body.seconds <= 0:
        raise HTTPException(status_code=400, detail="seconds must be positive.")
    existing = _countdown_tasks.get(instance["id"])
    if existing and not existing.done():
        raise HTTPException(status_code=400, detail="A shutdown countdown is already running for this server.")
    _countdown_tasks[instance["id"]] = asyncio.create_task(_run_countdown(instance, body.seconds))
    return {"seconds": body.seconds}


@router.post("/cancel-shutdown-countdown")
async def cancel_shutdown_countdown() -> dict[str, Any]:
    instance = _require_active_instance()
    task = _countdown_tasks.get(instance["id"])
    if task and not task.done():
        task.cancel()
        return {"cancelled": True}
    return {"cancelled": False}
