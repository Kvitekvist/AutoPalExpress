from pathlib import Path
from typing import Any

from app.services import instance_storage

_STORE_NAME = "config"


def default_mods_path(server_path: str) -> str:
    return str(Path(server_path) / "Pal" / "Binaries" / "Win64" / "Mods")


def _get_config(instance_id: str) -> dict[str, Any]:
    return instance_storage.load(instance_id, _STORE_NAME, {"modsPathOverride": None})


def get_mods_path_info(instance: dict[str, Any]) -> dict[str, Any]:
    override = _get_config(instance["id"]).get("modsPathOverride")
    if override:
        return {"path": override, "source": "override"}
    return {"path": default_mods_path(instance["serverPath"]), "source": "derived"}


def get_mods_path(instance: dict[str, Any]) -> str | None:
    return get_mods_path_info(instance)["path"]


def set_mods_path_override(instance_id: str, path: str) -> None:
    instance_storage.save(instance_id, _STORE_NAME, {"modsPathOverride": path})


def clear_mods_path_override(instance_id: str) -> None:
    instance_storage.save(instance_id, _STORE_NAME, {"modsPathOverride": None})
