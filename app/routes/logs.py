from typing import Any

from fastapi import APIRouter

from app.services import activity_log, app_log_reader

router = APIRouter()


@router.get("")
async def get_logs() -> list[dict[str, Any]]:
    return activity_log.get_all()


@router.get("/streams")
async def get_log_streams() -> dict[str, Any]:
    return {
        "app": app_log_reader.read_tail(),
        "activity": activity_log.get_all(),
    }
