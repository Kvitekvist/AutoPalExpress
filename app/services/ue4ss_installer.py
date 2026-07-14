"""Downloads and installs UE4SS (the mod loader most Palworld Lua/Logic mods
require, including PalSchema) straight from GitHub releases into
<server>/Pal/Binaries/Win64.

Uses Okaetsu/RE-UE4SS's "experimental-palworld" build rather than the
generic UE4SS-RE/RE-UE4SS stable release (TICKET-0142): as of Palworld patch
0.4.1.5, PalSchema and most current-generation mods require this
Palworld-specific fork, which also lays files out differently - dwmapi.dll
stays directly in Win64, but everything else (UE4SS.dll, settings, Mods/)
lives one level deeper under a Win64/ue4ss/ folder, not flat in Win64 like
the old stable release. Leftover files from the old flat layout actively
conflict with this one (the old UE4SS.dll loads instead, silently breaking
PalSchema and its dependent mods), so installing/updating also cleans up any
flat-layout files this tool previously placed, and migrates any mods that
had landed in the old Win64/Mods folder into the new Win64/ue4ss/Mods.

Installing merges into any existing ue4ss/Mods folder rather than replacing
it, so mods a user already installed through this tool (or by hand) survive
an install/update. Uninstalling only removes the exact set of paths this
tool placed there (recorded at install time), so it never touches unrelated
mods.
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

GITHUB_REPO = "Okaetsu/RE-UE4SS"
RELEASE_ASSET_PATTERN = re.compile(r"^UE4SS-Palworld\.zip$")

# Files/folders this tool's *old* (pre-TICKET-0142) installs could have
# placed directly in Win64 using the legacy stable-release flat layout -
# cleaned up automatically on the next install/update since they conflict
# with the new nested layout.
_LEGACY_FLAT_ENTRIES = ("UE4SS.dll", "UE4SS-settings.ini", "UE4SS.pdb", "UE4SS_Signatures")
_LEGACY_FLAT_MODS_DIR = "Mods"

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
    return (win64 / "dwmapi.dll").is_file() and (win64 / "ue4ss" / "UE4SS.dll").is_file()


def _get_record(instance_id: str) -> dict[str, Any]:
    return instance_storage.load(instance_id, _STORE_NAME, {"version": None, "managedPaths": [], "installedAt": None})


def _save_record(instance_id: str, record: dict[str, Any]) -> None:
    instance_storage.save(instance_id, _STORE_NAME, record)


def builtin_mod_names(instance_id: str) -> set[str]:
    """Top-level folder names directly under the Mods folder that UE4SS's own
    release zip placed there (its built-in mods, e.g. BPModLoaderMod), so
    callers scanning for manually-installed mods (TICKET-0146) can tell those
    apart from anything a user actually added - derived from this install's
    own recorded managed paths rather than a hardcoded list, so it stays
    correct even if a future UE4SS release adds/renames its built-ins."""
    record = _get_record(instance_id)
    names: set[str] = set()
    for rel in record.get("managedPaths", []):
        parts = rel.split("/")
        if len(parts) >= 3 and parts[0] == "ue4ss" and parts[1] == "Mods":
            names.add(parts[2])
        elif len(parts) >= 2 and parts[0] == "Mods":
            names.add(parts[1])
    return names


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


def _merge_dir(src_dir: Path, dest_dir: Path, managed: set[str], rel_prefix: str) -> None:
    """Recursively copies src_dir's contents into dest_dir, merging rather
    than wholesale-replacing at every level, so a "Mods" folder is always
    merged per-child regardless of how deep the release zip nests it (a
    sibling of dwmapi.dll in the old flat layout, or under "ue4ss/" in the
    new one) - protecting mods already installed there across an
    install/update."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    for item in src_dir.iterdir():
        rel = f"{rel_prefix}{item.name}"
        if item.is_dir():
            _merge_dir(item, dest_dir / item.name, managed, f"{rel}/")
        else:
            shutil.copy2(item, dest_dir / item.name)
            managed.add(rel)


def _extract_and_merge(zip_path: Path, win64_dir: Path) -> list[str]:
    win64_dir.mkdir(parents=True, exist_ok=True)
    managed: set[str] = set()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(tmp_path)
        _merge_dir(tmp_path, win64_dir, managed, "")

    return sorted(managed)


def _clean_legacy_flat_install(win64_dir: Path) -> None:
    """Removes files this tool's pre-TICKET-0142 installs could have placed
    directly in Win64 (the old stable release's flat layout) before laying
    down the new nested one - PalSchema's own docs warn a leftover flat
    UE4SS.dll/settings file makes the OLD UE4SS load instead of the new one,
    silently breaking PalSchema and anything depending on it. Only touches
    the exact files this tool's own old layout used, never anything else a
    user placed in Win64 by hand."""
    for name in _LEGACY_FLAT_ENTRIES:
        target = win64_dir / name
        if target.is_file():
            target.unlink()
            logger.info("ue4ss_installer: removed legacy flat file %s", target)


def _migrate_legacy_flat_mods(win64_dir: Path) -> None:
    """Moves any mod folders that landed in the old flat Win64/Mods (this
    tool's pre-TICKET-0142 default) into the new Win64/ue4ss/Mods, so mods
    installed before this fix aren't silently stranded/ignored. Skips names
    that collide with something already in the new location rather than
    overwriting, since that'd be guessing which copy is newer."""
    legacy_mods = win64_dir / _LEGACY_FLAT_MODS_DIR
    if not legacy_mods.is_dir():
        return
    new_mods = win64_dir / "ue4ss" / "Mods"
    new_mods.mkdir(parents=True, exist_ok=True)
    for entry in list(legacy_mods.iterdir()):
        dest = new_mods / entry.name
        if dest.exists():
            logger.warning("ue4ss_installer: skipped migrating %s - already exists at %s", entry, dest)
            continue
        shutil.move(str(entry), str(dest))
        logger.info("ue4ss_installer: migrated legacy mod folder %s -> %s", entry, dest)
    try:
        next(legacy_mods.iterdir())
    except StopIteration:
        legacy_mods.rmdir()


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

    await asyncio.to_thread(_clean_legacy_flat_install, win64_dir)

    try:
        managed = await asyncio.to_thread(_extract_and_merge, dest_zip, win64_dir)
    except zipfile.BadZipFile:
        dest_zip.unlink(missing_ok=True)
        raise Ue4ssError("The downloaded UE4SS archive was corrupt. Try again.")

    await asyncio.to_thread(_migrate_legacy_flat_mods, win64_dir)

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
