from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from app.auth_deps import SESSION_COOKIE, get_current_user
from app.services import auth, login_throttle, session_store
from app.services.auth import AuthError

router = APIRouter()

_COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


@router.get("/status")
async def auth_status() -> dict[str, Any]:
    return {"needsSetup": not auth.has_any_users()}


class SetupRequest(BaseModel):
    username: str
    password: str


@router.post("/setup")
async def setup(body: SetupRequest, response: Response) -> dict[str, Any]:
    try:
        user = auth.create_first_super_admin(body.username, body.password)
    except AuthError as e:
        raise HTTPException(status_code=400, detail=e.message)
    _set_session_cookie(response, user["id"])
    return auth.public_view(user)


class RegisterRequest(BaseModel):
    username: str
    password: str
    inviteCode: str


@router.post("/register")
async def register(body: RegisterRequest, response: Response) -> dict[str, Any]:
    try:
        user = auth.register_with_invite(body.username, body.password, body.inviteCode)
    except AuthError as e:
        raise HTTPException(status_code=400, detail=e.message)
    _set_session_cookie(response, user["id"])
    return auth.public_view(user)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, request: Request, response: Response) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "unknown"
    try:
        login_throttle.check(client_ip)
    except login_throttle.RateLimitedError as e:
        raise HTTPException(status_code=429, detail=str(e))

    user = auth.verify_login(body.username, body.password)
    if not user:
        login_throttle.record_failure(client_ip)
        raise HTTPException(status_code=401, detail="Wrong username or password.")
    login_throttle.record_success(client_ip)
    _set_session_cookie(response, user["id"])
    return auth.public_view(user)


@router.post("/logout")
async def logout(request: Request, response: Response) -> dict[str, bool]:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        session_store.delete_session(token)
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@router.get("/me")
async def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return auth.public_view(user)


class SetLanguageRequest(BaseModel):
    language: str


@router.patch("/me/language")
async def set_language(
    body: SetLanguageRequest, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    try:
        updated = auth.set_language(user["id"], body.language)
    except AuthError as e:
        raise HTTPException(status_code=400, detail=e.message)
    return auth.public_view(updated)


def _set_session_cookie(response: Response, user_id: str) -> None:
    token = session_store.create_session(user_id)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
