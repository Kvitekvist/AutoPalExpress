from typing import Any

from fastapi import HTTPException, Request

from app.services import auth, session_store

SESSION_COOKIE = "session_token"


def get_current_user(request: Request) -> dict[str, Any]:
    token = request.cookies.get(SESSION_COOKIE)
    user_id = session_store.get_user_id(token) if token else None
    user = auth.get_by_id(user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in.")
    return user


def require_super_admin(request: Request) -> dict[str, Any]:
    user = get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only the super admin can do that.")
    return user
