"""Manual "install from file" orchestration - hashing an uploaded archive,
checking it against Nexus's own catalog for a real published mod's version/
author metadata when possible, staging it under a short-lived token, and
installing it into the right mods folder once the admin confirms. See
app/routes/mods/manual.py's docstrings for the security rationale
(super-admin-only; the archive itself still goes through the same zip-slip/
zip-bomb-protected extraction as every other install path).

A hash match against Nexus is used to populate real name/author/version
metadata when available, but is no longer required to install - a super
admin uploading a file has already made the trust decision themselves,
the same as dropping a folder into the mods directory by hand (TICKET-0146
already treats that as normal, tracked activity). Mods installed via a
file that didn't match Nexus's catalog are marked manuallyInstalled, same
as a mod discovered already sitting on disk."""

import hashlib
import logging
import secrets
import zipfile
from pathlib import Path
from typing import Any

import py7zr
from fastapi import HTTPException, UploadFile

from app import paths
from app.services import mod_installer, mods_shared, mods_store, nexus_client, nexus_mod_service
from app.services.mod_installer import ModInstallError
from app.services.nexus_client import NexusApiError

logger = logging.getLogger("palworld_admin.mods")

VERIFIED_UPLOAD_DIR = paths.data_dir() / "verified_uploads"
VERIFIED_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB
_PENDING_VERIFIED_UPLOADS: dict[str, dict[str, Any]] = {}


async def prepare_upload(file: UploadFile) -> dict[str, Any]:
    """Step 1 of installing a mod file: saves the upload, computes its MD5,
    and checks that hash against Nexus's own fileHash lookup. A match fills
    in real name/author/version metadata; no match (or Nexus being
    unreachable) falls through to an unverified install instead of
    rejecting the file outright - the archive itself is still validated as
    a real .zip/.7z below and safely extracted later."""
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

    if not mod_installer.is_supported_archive(dest):
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Only .zip and .7z archives are supported.")

    md5_hash = digest.hexdigest()
    try:
        results = await nexus_client.file_hash_search(md5_hash)
    except NexusApiError as e:
        logger.info("install-from-file: Nexus hash lookup failed (%s) - continuing unverified", e.message)
        results = []

    if results:
        match = results[0]
        file_info = match.get("modFile") or {}
        mod_info = file_info.get("mod") or {}
        pending = {
            "path": dest,
            "modId": mod_info.get("modId") or file_info.get("modId"),
            "name": mod_info.get("name") or file_info.get("name") or "Unknown Mod",
            "author": mod_info.get("author") or "Unknown",
            "summary": mod_info.get("summary") or "",
            "version": file_info.get("version") or mod_info.get("version") or "0.0.0",
            "verified": True,
        }
    else:
        fallback = Path(file.filename or "Mod").stem
        pending = {
            "path": dest,
            "modId": None,
            "name": mod_installer.peek_archive_name(dest, fallback),
            "author": "Unknown",
            "summary": "",
            "version": "Unknown",
            "verified": False,
        }

    _PENDING_VERIFIED_UPLOADS[token] = pending
    return {
        "token": token,
        "verified": pending["verified"],
        "modName": pending["name"],
        "author": pending["author"],
        "version": pending["version"],
        "sizeBytes": written,
    }


async def confirm_upload(instance: dict[str, Any], token: str, mod_name: str | None = None) -> list[dict[str, Any]]:
    pending = _PENDING_VERIFIED_UPLOADS.pop(token, None)
    if not pending:
        raise HTTPException(status_code=404, detail="That upload has expired - try again.")

    name = (mod_name or "").strip() or pending["name"]
    dest = pending["path"]
    kind = mod_installer.detect_mod_kind(dest)
    install_path = mods_shared.base_path_for_kind(instance, kind)
    if not install_path:
        raise HTTPException(status_code=400, detail="No Mods folder configured for this server yet.")

    try:
        folder_name = mod_installer.extract_and_install(dest, Path(install_path), name)
    except (zipfile.BadZipFile, py7zr.exceptions.ArchiveError):
        raise HTTPException(status_code=422, detail="That file isn't a valid archive.")
    except ModInstallError as e:
        raise HTTPException(status_code=422, detail=e.message)
    except (OSError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Couldn't place mod files on disk: {e}")

    mods = mods_store.load_mods(instance["id"])
    existing = next((m for m in mods if m.get("sourceModId") == pending["modId"]), None) if pending["modId"] else None
    entry = {
        "id": existing["id"] if existing else mods_store.new_id("verified" if pending["verified"] else "manual"),
        "name": name,
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
        "installKind": kind,
        "manuallyInstalled": not pending["verified"],
    }
    if existing:
        mods = [entry if m["id"] == existing["id"] else m for m in mods]
    else:
        mods.append(entry)
    mods_store.save_mods(instance["id"], mods)
    return await nexus_mod_service.with_update_status(mods_store.sorted_mods(mods))


def cancel_upload(token: str) -> None:
    pending = _PENDING_VERIFIED_UPLOADS.pop(token, None)
    if pending:
        Path(pending["path"]).unlink(missing_ok=True)
