from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import system_settings

router = APIRouter()


class SystemSettingsRequest(BaseModel):
    bootWithWindows: bool
    autoStartActiveServer: bool


@router.get("")
async def get_system_settings() -> dict[str, Any]:
    return system_settings.get_config()


@router.post("")
async def update_system_settings(body: SystemSettingsRequest) -> dict[str, Any]:
    try:
        return system_settings.update_config(
            boot_with_windows=body.bootWithWindows,
            auto_start_active_server=body.autoStartActiveServer,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Couldn't update Windows startup: {e}")
