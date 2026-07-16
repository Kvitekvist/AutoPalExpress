"""Per-server Nexus mod requests awaiting a super-admin decision."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.services import instance_storage

_STORE_NAME = "mod_wishlist"


def list_requests(instance_id: str) -> list[dict[str, Any]]:
    return instance_storage.load(instance_id, _STORE_NAME, [])


def add_request(instance_id: str, mod: dict[str, Any], user: dict[str, Any]) -> list[dict[str, Any]]:
    requests = list_requests(instance_id)
    nexus_mod_id = int(mod["nexusModId"])
    if any(int(item["nexusModId"]) == nexus_mod_id for item in requests):
        return requests
    requests.append(
        {
            "id": uuid4().hex,
            "nexusModId": nexus_mod_id,
            "name": mod["name"].strip(),
            "author": mod["author"].strip(),
            "summary": mod.get("summary", "").strip(),
            "pictureUrl": mod.get("pictureUrl"),
            "nexusUrl": mod["nexusUrl"],
            "requestedBy": user["username"],
            "requestedAt": datetime.now(UTC).isoformat(),
        }
    )
    instance_storage.save(instance_id, _STORE_NAME, requests)
    return requests


def get_request(instance_id: str, request_id: str) -> dict[str, Any] | None:
    return next((item for item in list_requests(instance_id) if item["id"] == request_id), None)


def remove_request(instance_id: str, request_id: str) -> bool:
    requests = list_requests(instance_id)
    updated = [item for item in requests if item["id"] != request_id]
    if len(updated) == len(requests):
        return False
    instance_storage.save(instance_id, _STORE_NAME, updated)
    return True
