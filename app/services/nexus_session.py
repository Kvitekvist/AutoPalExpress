from typing import Any

from fastapi import HTTPException

from app import storage

_STORE_NAME = "nexus"


def get_record() -> dict[str, Any]:
    record = storage.load(_STORE_NAME, {"connected": False})
    if record.get("connected") and record.get("via") != "sso":
        # Nexus's application registration requires removing personal API key
        # usage entirely - a connection saved before the SSO flow existed (or
        # any record missing the "via": "sso" marker) is exactly that, and
        # must not keep authenticating installs just because it predates this
        # check. Self-heals on the very next read, no separate migration step.
        record = {"connected": False}
        storage.save(_STORE_NAME, record)
    return record


def save_record(record: dict[str, Any]) -> None:
    storage.save(_STORE_NAME, record)


def account_view() -> dict[str, Any]:
    record = get_record()
    if not record.get("connected"):
        return {"connected": False}
    username = record.get("username") or "?"
    return {
        "connected": True,
        "username": username,
        "userId": record.get("userId"),
        "isPremium": bool(record.get("isPremium")),
        "avatarInitial": username[:1].upper(),
    }


def require_api_key() -> str:
    record = get_record()
    if not record.get("connected") or not record.get("apiKey"):
        raise HTTPException(status_code=401, detail="Connect a Nexus Mods API key in Super Admin first.")
    return record["apiKey"]


def require_premium_api_key() -> str:
    record = get_record()
    api_key = require_api_key()
    if not record.get("isPremium"):
        raise HTTPException(
            status_code=403,
            detail="Nexus Mods Premium is required to install mods automatically. "
            "Open the mod's Nexus Mods page to download it manually.",
        )
    return api_key
