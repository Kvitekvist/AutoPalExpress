"""Nexus-download orchestration for mod installs - selecting a downloadable
file from a Nexus mod's file list, downloading it, and installing it into
the right mods folder. Used by both the direct "install from Nexus" route
and Mod Wishlist approval."""

import logging
import zipfile
from pathlib import Path
from typing import Any

import httpx
import py7zr
from fastapi import HTTPException

from app import paths
from app.services import local_config, mod_installer, mods_shared, mods_store, nexus_client, nexus_session
from app.services.mod_installer import ModInstallError
from app.services.nexus_client import NexusApiError

logger = logging.getLogger("palworld_admin.mods")

NEXUS_DOWNLOAD_DIR = paths.data_dir() / "nexus_downloads"
NEXUS_DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def with_update_status(mods: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Populates real updateAvailable/latestVersion (previously always false/
    unset) via a single keyless GraphQL lookup, computed per-request rather
    than persisted so it always reflects Nexus's current published version.
    Also flags manually-installed mods - verified file uploads (`verified-`
    id prefix) and mods discovered already sitting on disk instead of
    installed through this app (`manuallyInstalled` already set true by
    `mods_shared.register_untracked_disk_mods`) - since their sourceModId (if
    any) only proves a hash match with something on Nexus, not that they
    came through the Nexus download/wishlist pipeline "Request Update"
    triggers, so they're excluded from the update check entirely."""
    mods = [
        {**m, "manuallyInstalled": m["id"].startswith("verified-") or m.get("manuallyInstalled", False)} for m in mods
    ]
    mod_ids = [m["sourceModId"] for m in mods if m.get("sourceModId") and not m["manuallyInstalled"]]
    if not mod_ids:
        return mods
    try:
        current_versions = await nexus_client.get_current_versions(mod_ids)
    except NexusApiError as e:
        logger.info("mods: skipping update check (%s)", e.message)
        return mods

    result = []
    for m in mods:
        current = current_versions.get(m.get("sourceModId"))
        if current and current != m.get("version"):
            m = {**m, "updateAvailable": True, "latestVersion": current}
        result.append(m)
    return result


def is_main_file(file_info: dict[str, Any]) -> bool:
    category_id = file_info.get("category_id")
    category_name = str(file_info.get("category_name") or "").lower()
    return category_id == 1 or "main" in category_name


def installable_nexus_files(files_payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Current (non-old-version) files, Main file(s) first then newest-first -
    same candidate set/ordering `_select_installable_nexus_file` used to pick
    a single winner from, now exposed so a mod with more than one current
    file (e.g. Main + Optional Files) can be shown as real choices instead of
    only ever installing whichever one sorts first."""
    files = files_payload.get("files") or []
    if not files:
        raise HTTPException(status_code=404, detail="Nexus returned no downloadable files for this mod.")

    candidates = [f for f in files if not f.get("is_old_version")]
    if not candidates:
        candidates = files
    return sorted(candidates, key=lambda f: (not is_main_file(f), -(f.get("uploaded_timestamp") or 0)))


def _select_installable_nexus_file(files_payload: dict[str, Any], file_id: int | None = None) -> dict[str, Any]:
    candidates = installable_nexus_files(files_payload)
    if file_id is None:
        return candidates[0]
    for f in files_payload.get("files") or []:
        if int(f.get("file_id", -1)) == file_id:
            return f
    raise HTTPException(status_code=404, detail="That file is no longer available for this mod on Nexus.")


def _download_link_url(links: list[dict[str, Any]]) -> str:
    for link in links:
        url = link.get("URI") or link.get("uri")
        if url:
            return str(url)
    raise HTTPException(status_code=502, detail="Nexus did not return a usable download mirror.")


def _safe_download_name(name: str, fallback: str) -> str:
    cleaned = "".join(ch for ch in name if ch.isalnum() or ch in " ._-").strip()
    return cleaned or fallback


async def install_nexus_mod(
    instance: dict[str, Any], nexus_mod_id: int, file_id: int | None = None
) -> list[dict[str, Any]]:
    api_key = nexus_session.require_premium_api_key()
    mods_path = local_config.get_mods_path(instance)
    if not mods_path:
        raise HTTPException(status_code=400, detail="No Mods folder configured for this server yet.")

    try:
        details = await nexus_client.get_mod_details(api_key, nexus_mod_id)
        files_payload = await nexus_client.get_mod_files(api_key, nexus_mod_id)
        file_info = _select_installable_nexus_file(files_payload, file_id)
        file_id = int(file_info["file_id"])
        links = await nexus_client.get_download_link(api_key, nexus_mod_id, file_id)
    except NexusApiError as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=502, detail="Nexus returned an unexpected file response.")

    file_name = _safe_download_name(
        str(file_info.get("file_name") or file_info.get("name") or ""),
        f"nexus-{nexus_mod_id}-{file_id}.zip",
    )
    if "." not in file_name:
        # Only guess an extension when the real name didn't have one at all -
        # forcing ".zip" unconditionally used to mislabel real .7z downloads.
        file_name = f"{file_name}.zip"
    dest = NEXUS_DOWNLOAD_DIR / f"{nexus_mod_id}-{file_id}-{file_name}"

    try:
        await nexus_client.download_file(_download_link_url(links), dest)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Nexus file download failed.")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Nexus file download failed: {e}")

    if not mod_installer.is_supported_archive(dest):
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422, detail="The downloaded Nexus file is not a supported archive (.zip or .7z)."
        )

    mod_name = details.get("name") or file_info.get("name") or "Nexus Mod"
    kind = mod_installer.detect_mod_kind(dest)
    install_path = mods_shared.base_path_for_kind(instance, kind)
    if not install_path:
        raise HTTPException(status_code=400, detail="No Mods folder configured for this server yet.")
    try:
        folder_name = mod_installer.extract_and_install(dest, Path(install_path), mod_name)
    except (zipfile.BadZipFile, py7zr.exceptions.ArchiveError):
        raise HTTPException(status_code=422, detail="The downloaded Nexus file is not a valid archive.")
    except ModInstallError as e:
        raise HTTPException(status_code=422, detail=e.message)
    except (OSError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Couldn't place mod files on disk: {e}")

    mods = mods_store.load_mods(instance["id"])
    existing = next((m for m in mods if m.get("sourceModId") == nexus_mod_id), None)
    entry = {
        "id": existing["id"] if existing else mods_store.new_id("nexus"),
        "name": mod_name,
        "version": file_info.get("version") or details.get("version") or "See Nexus",
        "author": details.get("author") or "Unknown",
        "description": details.get("summary") or details.get("description") or "",
        "dependencies": existing.get("dependencies", []) if existing else [],
        "status": "enabled",
        "loadPriority": existing["loadPriority"] if existing else len(mods) + 1,
        "updateAvailable": False,
        "sourceModId": nexus_mod_id,
        "downloadedFile": str(dest),
        "folderName": folder_name,
        "installKind": kind,
    }
    if existing:
        mods = [entry if m["id"] == existing["id"] else m for m in mods]
    else:
        mods.append(entry)
    mods_store.save_mods(instance["id"], mods)
    return await with_update_status(mods_store.sorted_mods(mods))
