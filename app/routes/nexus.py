from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth_deps import require_super_admin
from app.services import nexus_client, nexus_session
from app.services.nexus_client import NexusApiError

router = APIRouter()

_category_cache: dict[int, str] | None = None


class ConnectRequest(BaseModel):
    api_key: str


# account_view() never exposes the raw API key, and every admin's browse UI
# needs to read connection/premium status to render correctly - so only the
# actions that change the shared connection (connect/disconnect) are
# super-admin-only, not this read.
@router.get("/account")
async def get_account() -> dict[str, Any]:
    return nexus_session.account_view()


@router.post("/connect", dependencies=[Depends(require_super_admin)])
async def connect(body: ConnectRequest) -> dict[str, Any]:
    try:
        data = await nexus_client.validate_key(body.api_key)
    except NexusApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    nexus_session.save_record(
        {
            "connected": True,
            "apiKey": body.api_key,
            "username": data.get("name"),
            "userId": data.get("user_id"),
            "isPremium": bool(data.get("is_premium")),
        }
    )
    return nexus_session.account_view()


@router.post("/disconnect", dependencies=[Depends(require_super_admin)])
async def disconnect() -> dict[str, Any]:
    nexus_session.save_record({"connected": False})
    return {"connected": False}


async def _get_category_map(api_key: str) -> dict[int, str]:
    global _category_cache
    if _category_cache is None:
        raw = await nexus_client.get_game_categories(api_key)
        _category_cache = {c["category_id"]: c["name"] for c in raw}
    return _category_cache


def _map_mod_summary(m: dict[str, Any], category_map: dict[int, str]) -> dict[str, Any]:
    mod_id = m.get("mod_id")
    category_id = m.get("category_id")
    return {
        "id": str(mod_id),
        "modId": mod_id,
        "name": m.get("name") or "Untitled Mod",
        "author": m.get("author") or (m.get("user") or {}).get("name") or "Unknown",
        "summary": m.get("summary") or "",
        "version": m.get("version") or "0.0.0",
        "categoryId": category_id,
        "categoryName": category_map.get(category_id, "Uncategorized"),
        "downloads": m.get("mod_downloads") or 0,
        "endorsements": m.get("endorsement_count") or 0,
        "pictureUrl": m.get("picture_url"),
        "nexusUrl": f"https://www.nexusmods.com/games/{nexus_client.GAME_DOMAIN}/mods/{mod_id}",
    }


@router.get("/mods")
async def list_mods(
    list: str = Query("trending", pattern="^(trending|latest_added|latest_updated)$"),
) -> list[dict[str, Any]]:
    api_key = nexus_session.require_api_key()
    try:
        raw = await nexus_client.get_mod_list(api_key, list)
        category_map = await _get_category_map(api_key)
    except NexusApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    return [_map_mod_summary(m, category_map) for m in raw]
