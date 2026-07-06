"""Downloads and installs UE4SS (the mod loader most Palworld Lua/Logic mods
require) straight from its GitHub releases into <server>/Pal/Binaries/Win64.

Installing merges into any existing Mods folder rather than replacing it, so
mods a user already installed through this tool (or by hand) survive an
install/update. Uninstalling only removes the exact set of paths this tool
placed there (recorded at install time), so it never touches unrelated mods.
"""

import asyncio
import logging
import re
import shutil
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Any

import httpx

from app.paths import data_dir
from app.services import instance_storage

logger = logging.getLogger("palworld_admin.ue4ss_installer")

GITHUB_REPO = "UE4SS-RE/RE-UE4SS"
RELEASE_ASSET_PATTERN = re.compile(r"^UE4SS_v.*\.zip$")

DOWNLOAD_DIR = data_dir() / "ue4ss_downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

_STORE_NAME = "ue4ss"


class Ue4ssError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _win64_dir(server_path: Path) -> Path:
    return server_path / "Pal" / "Binaries" / "Win64"


def _is_installed_on_disk(server_path: Path) -> bool:
    win64 = _win64_dir(server_path)
    return (win64 / "dwmapi.dll").is_file() and (win64 / "UE4SS.dll").is_file()


def _get_record(instance_id: str) -> dict[str, Any]:
    return instance_storage.load(instance_id, _STORE_NAME, {"version": None, "managedPaths": [], "installedAt": None})


def _save_record(instance_id: str, record: dict[str, Any]) -> None:
    instance_storage.save(instance_id, _STORE_NAME, record)


def get_status(instance: dict[str, Any] | None) -> dict[str, Any]:
    if not instance:
        return {"installed": False, "installedVersion": None}
    installed = _is_installed_on_disk(Path(instance["serverPath"]))
    record = _get_record(instance["id"])
    return {
        "installed": installed,
        "installedVersion": record.get("version") if installed else None,
    }


async def fetch_latest_release() -> dict[str, Any]:
    url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(url, headers={"Accept": "application/vnd.github+json"})
    except httpx.HTTPError as e:
        raise Ue4ssError(f"Couldn't reach GitHub to check for UE4SS releases: {e}")

    if resp.status_code != 200:
        raise Ue4ssError(f"GitHub returned {resp.status_code} while checking for the latest UE4SS release.")

    data = resp.json()
    assets = data.get("assets", [])
    asset = next((a for a in assets if RELEASE_ASSET_PATTERN.match(a["name"])), None)
    if not asset:
        raise Ue4ssError("Couldn't find a matching UE4SS release asset (expected a 'UE4SS_vX.Y.Z.zip' file).")

    return {
        "version": data.get("tag_name") or "unknown",
        "assetName": asset["name"],
        "downloadUrl": asset["browser_download_url"],
        "size": asset.get("size", 0),
    }


async def _download(url: str, dest: Path) -> None:
    async with httpx.AsyncClient(timeout=180, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                async for chunk in resp.aiter_bytes():
                    f.write(chunk)


def _extract_and_merge(zip_path: Path, win64_dir: Path) -> list[str]:
    win64_dir.mkdir(parents=True, exist_ok=True)
    managed: set[str] = set()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(tmp_path)

        for item in tmp_path.iterdir():
            if item.name == "Mods" and item.is_dir():
                # Merge UE4SS's built-in mods into the existing Mods folder
                # instead of replacing it, so previously installed mods stay put.
                dest_mods = win64_dir / "Mods"
                dest_mods.mkdir(parents=True, exist_ok=True)
                for sub in item.iterdir():
                    dest_sub = dest_mods / sub.name
                    if sub.is_dir():
                        if dest_sub.exists():
                            shutil.rmtree(dest_sub)
                        shutil.copytree(sub, dest_sub)
                    else:
                        shutil.copy2(sub, dest_sub)
                    managed.add(f"Mods/{sub.name}")
            else:
                dest = win64_dir / item.name
                if item.is_dir():
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.copytree(item, dest)
                else:
                    shutil.copy2(item, dest)
                managed.add(item.name)

    return sorted(managed)


async def install(instance: dict[str, Any]) -> dict[str, Any]:
    server_path = Path(instance["serverPath"])
    win64_dir = _win64_dir(server_path)
    if not win64_dir.is_dir():
        raise Ue4ssError(f"'{win64_dir}' doesn't exist - is the server folder set correctly?")

    release = await fetch_latest_release()

    dest_zip = DOWNLOAD_DIR / release["assetName"]
    if not dest_zip.is_file():
        logger.info("ue4ss_installer: downloading %s", release["downloadUrl"])
        await _download(release["downloadUrl"], dest_zip)
    else:
        logger.info("ue4ss_installer: reusing cached download %s", dest_zip)

    try:
        managed = await asyncio.to_thread(_extract_and_merge, dest_zip, win64_dir)
    except zipfile.BadZipFile:
        dest_zip.unlink(missing_ok=True)
        raise Ue4ssError("The downloaded UE4SS archive was corrupt. Try again.")

    _save_record(instance["id"], {"version": release["version"], "managedPaths": managed, "installedAt": time.time()})
    logger.info("ue4ss_installer: installed UE4SS %s into %s", release["version"], win64_dir)
    return get_status(instance)


def uninstall(instance: dict[str, Any]) -> None:
    record = _get_record(instance["id"])
    win64_dir = _win64_dir(Path(instance["serverPath"]))
    for rel in record.get("managedPaths", []):
        target = win64_dir / rel
        if target.is_dir():
            shutil.rmtree(target, ignore_errors=True)
        elif target.is_file():
            target.unlink(missing_ok=True)
    _save_record(instance["id"], {"version": None, "managedPaths": [], "installedAt": None})
    logger.info("ue4ss_installer: uninstalled UE4SS from %s", win64_dir)
