from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth_deps import require_super_admin
from app.services import auth, session_store
from app.services.auth import AuthError

router = APIRouter(dependencies=[Depends(require_super_admin)])


@router.get("")
async def list_users() -> list[dict[str, Any]]:
    return auth.list_users()


@router.get("/invites")
async def list_invites() -> list[dict[str, Any]]:
    return auth.list_invites()


@router.post("/invites")
async def create_invite() -> dict[str, Any]:
    return auth.create_invite()


@router.delete("/invites/{code}")
async def revoke_invite(code: str) -> list[dict[str, Any]]:
    auth.revoke_invite(code)
    return auth.list_invites()


@router.delete("/{user_id}")
async def remove_user(user_id: str) -> list[dict[str, Any]]:
    try:
        auth.remove_user(user_id)
    except AuthError as e:
        raise HTTPException(status_code=400, detail=e.message)
    session_store.delete_all_sessions_for_user(user_id)
    return auth.list_users()
