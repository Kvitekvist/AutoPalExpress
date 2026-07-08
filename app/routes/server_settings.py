from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth_deps import get_current_user
from app.services import instance_store, palworld_settings

router = APIRouter()

# AdminPassword/ServerPassword are real credentials (AdminPassword is used by
# Palworld's local REST API - equivalent to direct, tool-bypassing control of
# the game server), not day-to-day settings like difficulty or EXP rate. Only the
# super admin can see their real value or change them - a friend-admin whose
# access is later revoked shouldn't have been able to read this out of the
# Network tab and keep using it directly.
_CREDENTIAL_FIELDS = {"AdminPassword", "ServerPassword"}
_REDACTED = "••••••••"


def _require_active_instance() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        raise HTTPException(status_code=400, detail="No server selected. Create or import one in Settings.")
    return instance


def _redact_credentials(fields: list[dict[str, Any]], user: dict[str, Any]) -> list[dict[str, Any]]:
    if user["role"] == "super_admin":
        return fields
    return [{**f, "value": _REDACTED} if f["key"] in _CREDENTIAL_FIELDS else f for f in fields]


def _settings_view(instance: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    fields = palworld_settings.read_all_settings(Path(instance["serverPath"]))
    return {"fields": _redact_credentials(fields, user)}


@router.get("")
async def get_settings(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    instance = _require_active_instance()
    return _settings_view(instance, user)


class UpdateSettingsRequest(BaseModel):
    values: dict[str, Any]


@router.post("")
async def update_settings(
    body: UpdateSettingsRequest, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    instance = _require_active_instance()
    if user["role"] != "super_admin" and _CREDENTIAL_FIELDS & body.values.keys():
        raise HTTPException(status_code=403, detail="Only the super admin can change the REST API/server password.")
    try:
        palworld_settings.write_settings(Path(instance["serverPath"]), body.values)
    except (ValueError, OSError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    # PublicPort is edited here, in the live ini, not in instances.json - keep
    # the stored gamePort from going stale too (display elsewhere, and the
    # fallback used if this ini ever loses its PublicPort field).
    if "PublicPort" in body.values:
        instance_store.update_game_port(instance["id"], int(body.values["PublicPort"]))

    updated_instance = instance_store.get(instance["id"]) or instance
    return _settings_view(updated_instance, user)
