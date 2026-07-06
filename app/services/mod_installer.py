"""Places downloaded Nexus mod archives into a real UE4SS Mods folder on disk,
and toggles them on/off by moving the mod's folder in and out of that directory
(so a disabled mod is guaranteed invisible to UE4SS regardless of whether it
also honors a per-mod enabled.txt convention) plus writing "1"/"0" to
enabled.txt when the mod ships one, since some UE4SS mods check that file too.
"""

import logging
import re
import shutil
import tempfile
import zipfile
from pathlib import Path

from app.paths import data_dir

logger = logging.getLogger("palworld_admin.mod_installer")

STAGING_DIR = data_dir() / "disabled_mods"
STAGING_DIR.mkdir(parents=True, exist_ok=True)

MAX_UNCOMPRESSED_BYTES = 1024**3  # 1 GB - generous for a mod, guards against zip bombs


class ModInstallError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _sanitize_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 _.\-]", "", name).strip()
    return cleaned or "Mod"


def _safe_extract(z: zipfile.ZipFile, dest_dir: Path) -> None:
    """Extracts with explicit checks rather than trusting zipfile.extractall
    alone - defends against zip-slip (archive entries that resolve outside
    dest_dir via '..' or absolute paths) and zip bombs (archives that are
    tiny compressed but enormous once extracted), since mod archives can now
    come from a plain upload, not just Nexus's own servers."""
    total_size = 0
    resolved_dest = dest_dir.resolve()
    for member in z.infolist():
        total_size += member.file_size
        if total_size > MAX_UNCOMPRESSED_BYTES:
            raise ModInstallError("This archive is too large to be a legitimate mod (over 1 GB uncompressed).")

        member_path = (dest_dir / member.filename).resolve()
        if member_path != resolved_dest and resolved_dest not in member_path.parents:
            raise ModInstallError(f"Archive contains an unsafe path ('{member.filename}') and was rejected.")

    z.extractall(dest_dir)


def peek_archive_name(zip_path: Path, fallback_name: str) -> str:
    """Looks at a zip's own entry names to guess the mod's name without
    extracting anything yet - same "single common top-level folder" rule
    extract_and_install uses, so the name shown in a pre-install confirmation
    matches the folder name actually created a moment later."""
    with zipfile.ZipFile(zip_path) as z:
        top_levels = {n.split("/", 1)[0] for n in z.namelist() if n.strip("/")}
    if len(top_levels) == 1:
        return _sanitize_name(next(iter(top_levels)))
    return _sanitize_name(fallback_name)


def extract_and_install(zip_path: Path, mods_path: Path, fallback_name: str) -> str:
    """Extracts the archive and places its mod folder inside mods_path (enabled).

    Returns the folder name used, so it can be recorded and reused for
    enable/disable/remove later.
    """
    mods_path.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(zip_path) as z:
            _safe_extract(z, tmp_path)

        entries = list(tmp_path.iterdir())
        if len(entries) == 1 and entries[0].is_dir():
            source_dir = entries[0]
            folder_name = _sanitize_name(source_dir.name)
        else:
            folder_name = _sanitize_name(fallback_name)
            source_dir = tmp_path

        dest = mods_path / folder_name
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(source_dir, dest)

    _set_enabled_flag(dest, True)
    logger.info("Installed mod folder %r into %s", folder_name, mods_path)
    return folder_name


def _set_enabled_flag(mod_dir: Path, enabled: bool) -> None:
    enabled_file = mod_dir / "enabled.txt"
    enabled_file.write_text("1" if enabled else "0")


def disable(mods_path: Path, folder_name: str) -> None:
    source = mods_path / folder_name
    if not source.exists():
        logger.warning("disable: %s not found in %s (already disabled?)", folder_name, mods_path)
        return
    dest = STAGING_DIR / folder_name
    if dest.exists():
        shutil.rmtree(dest)
    shutil.move(str(source), str(dest))
    logger.info("Disabled mod %r: moved out of live Mods folder", folder_name)


def enable(mods_path: Path, folder_name: str) -> None:
    source = STAGING_DIR / folder_name
    dest = mods_path / folder_name
    if source.exists():
        if dest.exists():
            shutil.rmtree(dest)
        shutil.move(str(source), str(dest))
        logger.info("Enabled mod %r: moved back into live Mods folder", folder_name)
    if dest.exists():
        _set_enabled_flag(dest, True)


def remove(mods_path: Path, folder_name: str) -> None:
    for base in (mods_path, STAGING_DIR):
        candidate = base / folder_name
        if candidate.exists():
            shutil.rmtree(candidate)
            logger.info("Removed mod folder %r from %s", folder_name, base)
