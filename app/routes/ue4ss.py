import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from app.services import instance_store, ue4ss_installer
from app.services.ue4ss_installer import Ue4ssError

logger = logging.getLogger("palworld_admin.ue4ss")

router = APIRouter()


def _require_active_instance() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        raise HTTPException(status_code=400, detail="No server selected. Create or import one in Settings.")
    return instance


@router.get("/status")
async def get_status() -> dict[str, Any]:
    return ue4ss_installer.get_status(instance_store.get_active())


@router.get("/latest")
async def get_latest() -> dict[str, Any]:
    try:
        return await ue4ss_installer.fetch_latest_release()
    except Ue4ssError as e:
        raise HTTPException(status_code=502, detail=e.message)


@router.post("/install")
async def install_ue4ss() -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        return await ue4ss_installer.install(instance)
    except Ue4ssError as e:
        raise HTTPException(status_code=502, detail=e.message)
    except OSError as e:
        logger.exception("install_ue4ss failed")
        raise HTTPException(status_code=500, detail=f"Couldn't install UE4SS: {e}")


@router.post("/uninstall")
async def uninstall_ue4ss() -> dict[str, Any]:
    instance = _require_active_instance()
    ue4ss_installer.uninstall(instance)
    return ue4ss_installer.get_status(instance)
