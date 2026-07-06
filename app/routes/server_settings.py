from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import instance_store, palworld_settings

router = APIRouter()


def _require_active_instance() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        raise HTTPException(status_code=400, detail="No server selected. Create or import one in Settings.")
    return instance


@router.get("")
async def get_settings() -> dict[str, Any]:
    instance = _require_active_instance()
    return {"fields": palworld_settings.read_all_settings(Path(instance["serverPath"]))}


class UpdateSettingsRequest(BaseModel):
    values: dict[str, Any]


@router.post("")
async def update_settings(body: UpdateSettingsRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    try:
        palworld_settings.write_settings(Path(instance["serverPath"]), body.values)
    except (ValueError, OSError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    # PublicPort is edited here, in the live ini, not in instances.json - keep
    # the stored gamePort from going stale too (display elsewhere, and the
    # fallback used if this ini ever loses its PublicPort field).
    if "PublicPort" in body.values:
        instance_store.update_game_port(instance["id"], int(body.values["PublicPort"]))

    return {"fields": palworld_settings.read_all_settings(Path(instance["serverPath"]))}
