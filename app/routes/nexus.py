from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth_deps import require_super_admin
from app.services import nexus_client, nexus_session, nexus_sso
from app.services.nexus_client import NexusApiError

router = APIRouter()


# account_view() never exposes the raw API key. It remains public to authenticated
# admins so older installs can show/remove legacy Nexus connection state.
@router.get("/account")
async def get_account() -> dict[str, Any]:
    return nexus_session.account_view()


@router.post("/sso/start", dependencies=[Depends(require_super_admin)])
async def start_sso() -> dict[str, Any]:
    return nexus_sso.start()


@router.get("/sso/status/{request_id}", dependencies=[Depends(require_super_admin)])
async def get_sso_status(request_id: str) -> dict[str, Any]:
    session = nexus_sso.get_status(request_id)
    if not session:
        raise HTTPException(status_code=404, detail="This Nexus Mods connection request has expired. Try again.")

    if session["status"] == "pending":
        return {"status": "pending"}

    if session["status"] == "error":
        nexus_sso.finish(request_id)
        return {"status": "error", "message": session["error"]}

    # session["status"] == "authorized": finish the same validate-and-save
    # step the old pasted-key /connect endpoint used to do.
    try:
        data = await nexus_client.validate_key(session["apiKey"])
    except NexusApiError as e:
        nexus_sso.finish(request_id)
        return {"status": "error", "message": e.message}

    nexus_session.save_record(
        {
            "connected": True,
            "via": "sso",
            "apiKey": session["apiKey"],
            "username": data.get("name"),
            "userId": data.get("user_id"),
            "isPremium": bool(data.get("is_premium")),
        }
    )
    nexus_sso.finish(request_id)
    return {"status": "connected", "account": nexus_session.account_view()}


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
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    try:
        page = await nexus_client.get_mod_list(list, offset)
    except NexusApiError as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)
    return {"results": [_map_mod_summary(m) for m in page["nodes"]], "totalCount": page["totalCount"]}


@router.get("/search")
async def search_mods(q: str = Query(min_length=1, max_length=200), offset: int = Query(0, ge=0)) -> dict[str, Any]:
    """Real Nexus-side search by name (TICKET-0144), not just a client-side
    filter over whichever 60 mods the trending/latest lists already loaded.
    Paginated (TICKET-0149) - a broad search can easily match more than one
    page's worth, and previously results past the first (hardcoded) 60 were
    simply unreachable."""
    try:
        page = await nexus_client.search_mods(q, offset)
    except NexusApiError as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)
    return {"results": [_map_mod_summary(m) for m in page["nodes"]], "totalCount": page["totalCount"]}
