import time
from typing import Any

from app.services import instance_storage

_STORE_NAME = "mods"


def load_mods(instance_id: str) -> list[dict[str, Any]]:
    return instance_storage.load(instance_id, _STORE_NAME, [])


def save_mods(instance_id: str, mods: list[dict[str, Any]]) -> None:
    instance_storage.save(instance_id, _STORE_NAME, mods)


def sorted_mods(mods: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(mods, key=lambda m: m["loadPriority"])


def new_id(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}"
