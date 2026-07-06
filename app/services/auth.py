"""User accounts and invite codes.

Exactly one "super_admin" exists, and it's whoever creates the very first
account on this machine - a natural stand-in for "reserved for the host
machine" without needing any separate machine-identity check. Every account
after that is a normal "admin" and can only be created by redeeming an
invite code, since this app can run reachable from the internet and can
install files / run processes / start-stop the game server - open self-
registration would let a stranger who finds the URL grant themselves that.
"""

import hashlib
import hmac
import secrets
import time
from typing import Any

from app import storage

_USERS_STORE = "users"
_INVITES_STORE = "invites"

PBKDF2_ITERATIONS = 200_000


def _hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return salt, digest.hex()


def _verify_password(password: str, salt: str, expected_hash: str) -> bool:
    _, computed = _hash_password(password, salt)
    return hmac.compare_digest(computed, expected_hash)


def _load_users() -> list[dict[str, Any]]:
    return storage.load(_USERS_STORE, [])


def _save_users(users: list[dict[str, Any]]) -> None:
    storage.save(_USERS_STORE, users)


def has_any_users() -> bool:
    return bool(_load_users())


def get_by_username(username: str) -> dict[str, Any] | None:
    username_lower = username.strip().lower()
    return next((u for u in _load_users() if u["username"].lower() == username_lower), None)


def get_by_id(user_id: str) -> dict[str, Any] | None:
    return next((u for u in _load_users() if u["id"] == user_id), None)


def public_view(user: dict[str, Any]) -> dict[str, Any]:
    return {"id": user["id"], "username": user["username"], "role": user["role"], "createdAt": user["createdAt"]}


def list_users() -> list[dict[str, Any]]:
    return [public_view(u) for u in _load_users()]


class AuthError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def create_first_super_admin(username: str, password: str) -> dict[str, Any]:
    if has_any_users():
        raise AuthError("Setup has already been completed on this machine.")
    return _create_user(username, password, role="super_admin")


def register_with_invite(username: str, password: str, invite_code: str) -> dict[str, Any]:
    if not has_any_users():
        raise AuthError("No super admin account exists yet - set one up first.")
    _validate_invite(invite_code)
    user = _create_user(username, password, role="admin")
    _mark_invite_used(invite_code, user["id"])
    return user


def _create_user(username: str, password: str, *, role: str) -> dict[str, Any]:
    username = username.strip()
    if len(username) < 3:
        raise AuthError("Username must be at least 3 characters.")
    if len(password) < 8:
        raise AuthError("Password must be at least 8 characters.")
    if get_by_username(username):
        raise AuthError(f"'{username}' is already taken.")

    salt, password_hash = _hash_password(password)
    user = {
        "id": f"user-{secrets.token_hex(8)}",
        "username": username,
        "passwordSalt": salt,
        "passwordHash": password_hash,
        "role": role,
        "createdAt": time.time(),
    }
    users = _load_users()
    users.append(user)
    _save_users(users)
    return user


# A fixed dummy hash so a nonexistent username still costs one real PBKDF2
# round before returning - without this, "no such user" answers instantly
# while "wrong password for a real user" takes ~200k iterations, and that
# timing difference alone lets an attacker enumerate valid usernames.
_DUMMY_SALT, _DUMMY_HASH = _hash_password(secrets.token_hex(16))


def verify_login(username: str, password: str) -> dict[str, Any] | None:
    user = get_by_username(username)
    if not user:
        _verify_password(password, _DUMMY_SALT, _DUMMY_HASH)
        return None
    if not _verify_password(password, user["passwordSalt"], user["passwordHash"]):
        return None
    return user


def remove_user(user_id: str) -> None:
    users = _load_users()
    target = next((u for u in users if u["id"] == user_id), None)
    if not target:
        raise AuthError("No such user.")
    if target["role"] == "super_admin":
        raise AuthError("The super admin account can't be removed.")
    _save_users([u for u in users if u["id"] != user_id])


# --- Invite codes -----------------------------------------------------


def _load_invites() -> list[dict[str, Any]]:
    return storage.load(_INVITES_STORE, [])


def _save_invites(invites: list[dict[str, Any]]) -> None:
    storage.save(_INVITES_STORE, invites)


def create_invite() -> dict[str, Any]:
    invite = {"code": secrets.token_urlsafe(6), "createdAt": time.time(), "usedBy": None}
    invites = _load_invites()
    invites.append(invite)
    _save_invites(invites)
    return invite


def list_invites() -> list[dict[str, Any]]:
    return _load_invites()


def revoke_invite(code: str) -> None:
    invites = [i for i in _load_invites() if i["code"] != code]
    _save_invites(invites)


def _validate_invite(code: str) -> None:
    invite = next((i for i in _load_invites() if i["code"] == code), None)
    if not invite:
        raise AuthError("That invite code is invalid.")
    if invite["usedBy"]:
        raise AuthError("That invite code has already been used.")


def _mark_invite_used(code: str, user_id: str) -> None:
    invites = _load_invites()
    for i in invites:
        if i["code"] == code:
            i["usedBy"] = user_id
    _save_invites(invites)
