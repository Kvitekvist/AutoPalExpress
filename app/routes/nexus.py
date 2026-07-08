from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth_deps import require_super_admin
from app.services import nexus_client, nexus_session
from app.services.nexus_client import NexusApiError

router = APIRouter()

class ConnectRequest(BaseModel):
    api_key: str


# account_view() never exposes the raw API key. It remains public to authenticated
# admins so older installs can show/remove legacy Nexus connection state.
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


def _map_mod_summary(m: dict[str, Any]) -> dict[str, Any]:
    mod_id = m.get("modId")
    category = m.get("category") or "Uncategorized"
    return {
        "id": str(mod_id),
        "modId": mod_id,
        "name": m.get("name") or "Untitled Mod",
        "author": m.get("author") or "Unknown",
        "summary": m.get("summary") or "",
        "version": "See Nexus",
        "categoryId": None,
        "categoryName": category,
        "downloads": m.get("downloads") or 0,
        "endorsements": m.get("endorsements") or 0,
        "pictureUrl": m.get("pictureUrl"),
        "directDownloadEnabled": bool(m.get("directDownloadEnabled")),
        "nexusUrl": f"https://www.nexusmods.com/{nexus_client.GAME_DOMAIN}/mods/{mod_id}",
    }


@router.get("/mods")
async def list_mods(
    list: str = Query("trending", pattern="^(trending|latest_added|latest_updated)$"),
) -> list[dict[str, Any]]:
    try:
        raw = await nexus_client.get_mod_list(list)
    except NexusApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    return [_map_mod_summary(m) for m in raw]
