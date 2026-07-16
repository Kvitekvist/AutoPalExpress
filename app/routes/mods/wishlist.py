from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth_deps import get_current_user, require_super_admin
from app.routes.mods._shared import require_active_instance
from app.services import mod_wishlist, nexus_client, nexus_mod_service

router = APIRouter()


class WishlistRequest(BaseModel):
    nexusModId: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=100)
    summary: str = Field(default="", max_length=2000)
    pictureUrl: str | None = Field(default=None, max_length=2000)


@router.get("/wishlist")
async def get_wishlist() -> list[dict[str, Any]]:
    instance = require_active_instance()
    return mod_wishlist.list_requests(instance["id"])


@router.post("/wishlist")
async def add_to_wishlist(
    body: WishlistRequest, user: dict[str, Any] = Depends(get_current_user)
) -> list[dict[str, Any]]:
    instance = require_active_instance()
    return mod_wishlist.add_request(
        instance["id"],
        {
            **body.model_dump(),
            "nexusUrl": f"https://www.nexusmods.com/{nexus_client.GAME_DOMAIN}/mods/{body.nexusModId}",
        },
        user,
    )


@router.post("/wishlist/{request_id}/approve", dependencies=[Depends(require_super_admin)])
async def approve_wishlist_request(request_id: str) -> list[dict[str, Any]]:
    instance = require_active_instance()
    request = mod_wishlist.get_request(instance["id"], request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Mod wishlist request not found.")
    await nexus_mod_service.install_nexus_mod(instance, int(request["nexusModId"]))
    mod_wishlist.remove_request(instance["id"], request_id)
    return mod_wishlist.list_requests(instance["id"])


@router.post("/wishlist/{request_id}/deny", dependencies=[Depends(require_super_admin)])
async def deny_wishlist_request(request_id: str) -> list[dict[str, Any]]:
    instance = require_active_instance()
    if not mod_wishlist.remove_request(instance["id"], request_id):
        raise HTTPException(status_code=404, detail="Mod wishlist request not found.")
    return mod_wishlist.list_requests(instance["id"])
