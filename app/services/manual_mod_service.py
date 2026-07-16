"""Manual "install from file" orchestration - hashing an uploaded archive,
verifying it against Nexus's own catalog, staging it under a short-lived
token, and installing it into the right mods folder once the admin confirms.
See app/routes/mods/manual.py's docstrings for the security rationale
(super-admin-only, hash must match something Nexus actually hosts)."""

import hashlib
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

VERIFIED_UPLOAD_DIR = paths.data_dir() / "verified_uploads"
VERIFIED_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB
_PENDING_VERIFIED_UPLOADS: dict[str, dict[str, Any]] = {}


async def prepare_upload(file: UploadFile) -> dict[str, Any]:
    """Step 1 of installing an already-downloaded mod file: saves the upload,
    computes its MD5, and checks that hash against Nexus's own fileHash
    lookup. This is a real cryptographic check, not a claim - an empty
    result means these exact bytes have never been published as a Palworld
    mod on Nexus, and the upload is rejected outright."""
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
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=e.http_status, detail=f"Couldn't verify this file against Nexus: {e.message}")

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


async def confirm_upload(instance: dict[str, Any], token: str) -> list[dict[str, Any]]:
    pending = _PENDING_VERIFIED_UPLOADS.pop(token, None)
    if not pending:
        raise HTTPException(status_code=404, detail="That upload has expired - try again.")

    dest = pending["path"]
    kind = mod_installer.detect_mod_kind(dest)
    install_path = mods_shared.base_path_for_kind(instance, kind)
    if not install_path:
        raise HTTPException(status_code=400, detail="No Mods folder configured for this server yet.")

    try:
        folder_name = mod_installer.extract_and_install(dest, Path(install_path), pending["name"])
    except (zipfile.BadZipFile, py7zr.exceptions.ArchiveError):
        raise HTTPException(status_code=422, detail="That file isn't a valid archive.")
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
        "installKind": kind,
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
