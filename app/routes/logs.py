from typing import Any

from fastapi import APIRouter, Depends

from app.auth_deps import get_current_user
from app.services import activity_log, app_log_reader, privacy

router = APIRouter()


@router.get("")
async def get_logs() -> list[dict[str, Any]]:
    return activity_log.get_all()


@router.get("/streams")
async def get_log_streams(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {
        "app": app_log_reader.read_tail(mask_ips=user.get("role") != "super_admin" or privacy.is_enabled()),
        "activity": activity_log.get_all(),
    }
