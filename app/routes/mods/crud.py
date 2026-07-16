import asyncio
import zipfile
from pathlib import Path
from typing import Any

import py7zr
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth_deps import require_super_admin
from app.routes.mods._shared import require_active_instance
from app.services import instance_store, local_config, mod_installer, mods_shared, mods_store, native_dialog, nexus_mod_service
from app.services.mod_installer import ModInstallError

router = APIRouter()


@router.get("")
async def get_mods() -> list[dict[str, Any]]:
    instance = instance_store.get_active()
    if not instance:
        return []
    mods = mods_store.load_mods(instance["id"])
    mods = mods_shared.register_untracked_disk_mods(instance, mods)
    return await nexus_mod_service.with_update_status(mods_store.sorted_mods(mods))


@router.get("/mods-path")
async def get_mods_path() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        return {"modsPath": None, "source": None, "exists": False}
    return mods_shared.mods_path_view(instance)


class ModsPathRequest(BaseModel):
    path: str


@router.post("/mods-path", dependencies=[Depends(require_super_admin)])
async def set_mods_path(body: ModsPathRequest) -> dict[str, Any]:
    instance = require_active_instance()
    path = Path(body.path)
    if not path.is_dir():
        raise HTTPException(status_code=400, detail=f"'{body.path}' is not a folder that exists on this machine.")
    local_config.set_mods_path_override(instance["id"], str(path))
    return mods_shared.mods_path_view(instance)


@router.delete("/mods-path")
async def clear_mods_path() -> dict[str, Any]:
    instance = require_active_instance()
    local_config.clear_mods_path_override(instance["id"])
    return mods_shared.mods_path_view(instance)


@router.post("/mods-path/browse", dependencies=[Depends(require_super_admin)])
async def browse_mods_path() -> dict[str, Any]:
    instance = require_active_instance()
    current = local_config.get_mods_path(instance)
    path = await asyncio.to_thread(native_dialog.pick_folder, "Select your UE4SS Mods folder", current)
    return {"path": path}


@router.post("/{mod_id}/enable")
async def enable_mod(mod_id: str) -> list[dict[str, Any]]:
    instance = require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    for m in mods:
        if m["id"] == mod_id and m["status"] != "broken":
            mods_path = mods_shared.base_path_for_kind(instance, m.get("installKind", "ue4ss"))
            if m.get("folderName") and mods_path:
                try:
                    mod_installer.enable(Path(mods_path), m["folderName"])
                except OSError as e:
                    raise HTTPException(status_code=500, detail=f"Could not enable mod on disk: {e}")
            elif not m.get("folderName") and m.get("downloadedFile") and mods_path:
                # Was downloaded before a Mods folder was configured - install it now.
                downloaded = Path(m["downloadedFile"])
                if downloaded.is_file():
                    try:
                        kind = mod_installer.detect_mod_kind(downloaded)
                        mods_path = mods_shared.base_path_for_kind(instance, kind)
                        m["folderName"] = mod_installer.extract_and_install(downloaded, Path(mods_path), m["name"])
                        m["installKind"] = kind
                    except (zipfile.BadZipFile, py7zr.exceptions.ArchiveError):
                        raise HTTPException(
                            status_code=422,
                            detail=f"'{downloaded.name}' isn't a valid archive - can't install it automatically.",
                        )
                    except ModInstallError as e:
                        raise HTTPException(status_code=422, detail=e.message)
                    except (OSError, ValueError) as e:
                        raise HTTPException(status_code=500, detail=f"Could not place mod files on disk: {e}")
            m["status"] = "enabled"
    mods_store.save_mods(instance["id"], mods)
    return await nexus_mod_service.with_update_status(mods_store.sorted_mods(mods))


@router.post("/{mod_id}/disable")
async def disable_mod(mod_id: str) -> list[dict[str, Any]]:
    instance = require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    for m in mods:
        if m["id"] == mod_id:
            mods_path = mods_shared.base_path_for_kind(instance, m.get("installKind", "ue4ss"))
            if m.get("folderName") and mods_path:
                try:
                    mod_installer.disable(Path(mods_path), m["folderName"])
                except OSError as e:
                    raise HTTPException(status_code=500, detail=f"Could not disable mod on disk: {e}")
            m["status"] = "disabled"
    mods_store.save_mods(instance["id"], mods)
    return await nexus_mod_service.with_update_status(mods_store.sorted_mods(mods))


@router.post("/{mod_id}/remove")
async def remove_mod(mod_id: str) -> list[dict[str, Any]]:
    instance = require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    target = next((m for m in mods if m["id"] == mod_id), None)
    mods_path = mods_shared.base_path_for_kind(instance, target.get("installKind", "ue4ss")) if target else None
    if target and target.get("folderName") and mods_path:
        try:
            mod_installer.remove(Path(mods_path), target["folderName"])
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"Could not remove mod files from disk: {e}")
    mods = [m for m in mods if m["id"] != mod_id]
    mods_store.save_mods(instance["id"], mods)
    return await nexus_mod_service.with_update_status(mods_store.sorted_mods(mods))


class ReorderRequest(BaseModel):
    orderedIds: list[str]


@router.post("/reorder")
async def reorder(body: ReorderRequest) -> list[dict[str, Any]]:
    instance = require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    order = {mod_id: i + 1 for i, mod_id in enumerate(body.orderedIds)}
    for m in mods:
        if m["id"] in order:
            m["loadPriority"] = order[m["id"]]
    mods_store.save_mods(instance["id"], mods)
    return await nexus_mod_service.with_update_status(mods_store.sorted_mods(mods))
