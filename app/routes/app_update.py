from typing import Any

from fastapi import APIRouter

from app.services import app_update

router = APIRouter()


@router.get("")
async def get_update_status() -> dict[str, Any]:
    return await app_update.get_status()
