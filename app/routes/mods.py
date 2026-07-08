import asyncio
import hashlib
import logging
import secrets
import zipfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app import paths
from app.auth_deps import require_super_admin
from app.services import instance_store, local_config, mod_installer, mods_store, native_dialog, nexus_client
from app.services.mod_installer import ModInstallError
from app.services.nexus_client import NexusApiError

logger = logging.getLogger("palworld_admin.mods")

router = APIRouter()

VERIFIED_UPLOAD_DIR = paths.data_dir() / "verified_uploads"
VERIFIED_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB
_PENDING_VERIFIED_UPLOADS: dict[str, dict[str, Any]] = {}


def _require_active_instance() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        raise HTTPException(status_code=400, detail="No server selected. Create or import one in Settings.")
    return instance


@router.get("")
async def get_mods() -> list[dict[str, Any]]:
    instance = instance_store.get_active()
    if not instance:
        return []
    return mods_store.sorted_mods(mods_store.load_mods(instance["id"]))


def _mods_path_view(instance: dict[str, Any]) -> dict[str, Any]:
    info = local_config.get_mods_path_info(instance)
    path = info["path"]
    return {"modsPath": path, "source": info["source"], "exists": bool(path and Path(path).is_dir())}


@router.get("/mods-path")
async def get_mods_path() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        return {"modsPath": None, "source": None, "exists": False}
    return _mods_path_view(instance)


class ModsPathRequest(BaseModel):
    path: str


@router.post("/mods-path", dependencies=[Depends(require_super_admin)])
async def set_mods_path(body: ModsPathRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    path = Path(body.path)
    if not path.is_dir():
        raise HTTPException(status_code=400, detail=f"'{body.path}' is not a folder that exists on this machine.")
    local_config.set_mods_path_override(instance["id"], str(path))
    return _mods_path_view(instance)


@router.delete("/mods-path")
async def clear_mods_path() -> dict[str, Any]:
    instance = _require_active_instance()
    local_config.clear_mods_path_override(instance["id"])
    return _mods_path_view(instance)


@router.post("/mods-path/browse", dependencies=[Depends(require_super_admin)])
async def browse_mods_path() -> dict[str, Any]:
    instance = _require_active_instance()
    current = local_config.get_mods_path(instance)
    path = await asyncio.to_thread(native_dialog.pick_folder, "Select your UE4SS Mods folder", current)
    return {"path": path}


@router.post("/{mod_id}/enable")
async def enable_mod(mod_id: str) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    mods_path = local_config.get_mods_path(instance)
    for m in mods:
        if m["id"] == mod_id and m["status"] != "broken":
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
                        m["folderName"] = mod_installer.extract_and_install(downloaded, Path(mods_path), m["name"])
                    except zipfile.BadZipFile:
                        raise HTTPException(
                            status_code=422,
                            detail=f"'{downloaded.name}' isn't a .zip archive - can't install it automatically.",
                        )
                    except ModInstallError as e:
                        raise HTTPException(status_code=422, detail=e.message)
                    except (OSError, ValueError) as e:
                        raise HTTPException(status_code=500, detail=f"Could not place mod files on disk: {e}")
            m["status"] = "enabled"
    mods_store.save_mods(instance["id"], mods)
    return mods_store.sorted_mods(mods)


@router.post("/{mod_id}/disable")
async def disable_mod(mod_id: str) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    mods_path = local_config.get_mods_path(instance)
    for m in mods:
        if m["id"] == mod_id:
            if m.get("folderName") and mods_path:
                try:
                    mod_installer.disable(Path(mods_path), m["folderName"])
                except OSError as e:
                    raise HTTPException(status_code=500, detail=f"Could not disable mod on disk: {e}")
            m["status"] = "disabled"
    mods_store.save_mods(instance["id"], mods)
    return mods_store.sorted_mods(mods)


@router.post("/{mod_id}/remove")
async def remove_mod(mod_id: str) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    mods_path = local_config.get_mods_path(instance)
    target = next((m for m in mods if m["id"] == mod_id), None)
    if target and target.get("folderName") and mods_path:
        try:
            mod_installer.remove(Path(mods_path), target["folderName"])
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"Could not remove mod files from disk: {e}")
    mods = [m for m in mods if m["id"] != mod_id]
    mods_store.save_mods(instance["id"], mods)
    return mods_store.sorted_mods(mods)


class ReorderRequest(BaseModel):
    orderedIds: list[str]


@router.post("/reorder")
async def reorder(body: ReorderRequest) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    order = {mod_id: i + 1 for i, mod_id in enumerate(body.orderedIds)}
    for m in mods:
        if m["id"] in order:
            m["loadPriority"] = order[m["id"]]
    mods_store.save_mods(instance["id"], mods)
    return mods_store.sorted_mods(mods)


def _raise_nexus_downloads_paused() -> None:
    raise HTTPException(
        status_code=403,
        detail=(
            "One-click Nexus downloads are paused for the public release while AutoPalExpress follows Nexus Mods' "
            "registered app/OAuth process. Open the mod on Nexus Mods, download it there, then use Install From File "
            "in Super Admin."
        ),
    )


@router.post("/from-nexus/{nexus_mod_id}/install")
async def install_from_nexus(nexus_mod_id: int) -> list[dict[str, Any]]:
    _require_active_instance()
    _raise_nexus_downloads_paused()


@router.post("/{mod_id}/update")
async def update_mod(mod_id: str) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    mods = mods_store.load_mods(instance["id"])
    target = next((m for m in mods if m["id"] == mod_id), None)
    if not target or not target.get("sourceModId"):
        raise HTTPException(status_code=400, detail="This mod has no Nexus Mods source to update from.")
    _raise_nexus_downloads_paused()


@router.post("/install-from-file/prepare", dependencies=[Depends(require_super_admin)])
async def prepare_install_from_file(file: UploadFile = File(...)) -> dict[str, Any]:
    """Step 1 of installing an already-downloaded mod file: saves the upload,
    computes its MD5, and checks that hash against Nexus's own fileHash
    lookup. This is a real cryptographic check, not a claim - an empty
    result means these exact bytes have never been published as a Palworld
    mod on Nexus, and the upload is rejected outright. Super-admin-only:
    a matched hash proves the file is a byte-identical copy of something
    Nexus really hosts, which is the whole point, but the *decision* to
    place external files into the live Mods folder still shouldn't be
    something any invited admin can do unilaterally."""
    _require_active_instance()
    token = secrets.token_urlsafe(16)
    dest = VERIFIED_UPLOAD_DIR / f"{token}-{file.filename or 'upload.zip'}"

    digest = hashlib.md5()
    written = 0
    try:
        with open(dest, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="File is too large (max 500 MB).")
                digest.update(chunk)
                out.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise

    if not zipfile.is_zipfile(dest):
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Only .zip archives are supported.")

    md5_hash = digest.hexdigest()
    try:
        results = await nexus_client.file_hash_search(md5_hash)
    except NexusApiError as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=e.status_code, detail=f"Couldn't verify this file against Nexus: {e.message}")

    if not results:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail=(
                "This file doesn't match any published Palworld mod on Nexus Mods - rejected for safety. "
                "Only files that are byte-for-byte identical to something Nexus actually hosts can be installed "
                "this way."
            ),
        )

    match = results[0]
    file_info = match.get("modFile") or {}
    mod_info = file_info.get("mod") or {}
    mod_name = mod_info.get("name") or file_info.get("name") or "Unknown Mod"

    _PENDING_VERIFIED_UPLOADS[token] = {
        "path": dest,
        "modId": mod_info.get("modId") or file_info.get("modId"),
        "name": mod_name,
        "author": mod_info.get("author") or "Unknown",
        "summary": mod_info.get("summary") or "",
        "version": file_info.get("version") or mod_info.get("version") or "0.0.0",
    }
    return {
        "token": token,
        "verified": True,
        "modName": mod_name,
        "author": mod_info.get("author") or "Unknown",
        "version": file_info.get("version") or mod_info.get("version") or "0.0.0",
        "sizeBytes": written,
    }


class ConfirmFileInstallRequest(BaseModel):
    token: str


@router.post("/install-from-file/confirm", dependencies=[Depends(require_super_admin)])
async def confirm_install_from_file(body: ConfirmFileInstallRequest) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    pending = _PENDING_VERIFIED_UPLOADS.pop(body.token, None)
    if not pending:
        raise HTTPException(status_code=404, detail="That upload has expired - try again.")

    dest = pending["path"]
    mods_path = local_config.get_mods_path(instance)
    if not mods_path:
        raise HTTPException(status_code=400, detail="No Mods folder configured for this server yet.")

    try:
        folder_name = mod_installer.extract_and_install(dest, Path(mods_path), pending["name"])
    except zipfile.BadZipFile:
        raise HTTPException(status_code=422, detail="That file isn't a valid .zip archive.")
    except ModInstallError as e:
        raise HTTPException(status_code=422, detail=e.message)
    except (OSError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Couldn't place mod files on disk: {e}")

    mods = mods_store.load_mods(instance["id"])
    existing = next((m for m in mods if m.get("sourceModId") == pending["modId"]), None)
    entry = {
        "id": existing["id"] if existing else mods_store.new_id("verified"),
        "name": pending["name"],
        "version": pending["version"],
        "author": pending["author"],
        "description": pending["summary"],
        "dependencies": [],
        "status": "enabled",
        "loadPriority": existing["loadPriority"] if existing else len(mods) + 1,
        "updateAvailable": False,
        "sourceModId": pending["modId"],
        "downloadedFile": str(dest),
        "folderName": folder_name,
    }
    if existing:
        mods = [entry if m["id"] == existing["id"] else m for m in mods]
    else:
        mods.append(entry)
    mods_store.save_mods(instance["id"], mods)
    return mods_store.sorted_mods(mods)


@router.delete("/install-from-file/{token}", dependencies=[Depends(require_super_admin)])
async def cancel_install_from_file(token: str) -> dict[str, bool]:
    pending = _PENDING_VERIFIED_UPLOADS.pop(token, None)
    if pending:
        Path(pending["path"]).unlink(missing_ok=True)
    return {"ok": True}
