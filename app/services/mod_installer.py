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

import py7zr

from app.paths import data_dir

logger = logging.getLogger("palworld_admin.mod_installer")

STAGING_DIR = data_dir() / "disabled_mods"
STAGING_DIR.mkdir(parents=True, exist_ok=True)

MAX_UNCOMPRESSED_BYTES = 1024**3  # 1 GB - generous for a mod, guards against zip bombs

# Some mod archives package the mod's full relative install path from the
# Palworld server folder (Pal/Binaries/Win64/Mods/<ModName>/..., or
# Pal/Binaries/Win64/ue4ss/Mods/<ModName>/... - mod authors are inconsistent
# about whether they include the extra "ue4ss" segment UE4SS itself uses
# internally) instead of just the mod's own folder - a valid "drop this into
# your game folder" zip layout for a manual install, but wrong when the whole
# thing gets copied into a Mods folder that IS already .../Win64/ue4ss/Mods:
# it used to create Mods/Pal/Binaries/Win64/Mods/<ModName>/... (or the ue4ss
# variant) instead of Mods/<ModName>/...
_FIXED_PREFIX_SEGMENTS = ("pal", "binaries", "win64")
_OPTIONAL_MODLOADER_SEGMENT = "ue4ss"
_MODS_SEGMENT = "mods"

# Same idea for pak-based content mods that package their full relative path
# from the game folder (Pal/Content/Paks/~mods/<ModName>/...) instead of just
# the mod's own folder/file.
_PAKS_PREFIX_SEGMENTS = ("pal", "content", "paks")
_PAKS_MODS_SEGMENT = "~mods"


class ModInstallError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _sanitize_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 _.\-]", "", name).strip()
    return cleaned or "Mod"


def is_supported_archive(path: Path) -> bool:
    """Nexus mod files aren't always .zip (TICKET-0145) - also accept .7z,
    a fully open format with no external binary dependency (unlike .rar,
    which needs a bundled unrar binary/DLL - tracked separately as a
    follow-up given the packaging/licensing tradeoffs involved)."""
    return zipfile.is_zipfile(path) or py7zr.is_7zfile(path)


def _archive_names(path: Path) -> list[str]:
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as z:
            return [n for n in z.namelist() if n.strip("/")]
    with py7zr.SevenZipFile(path, "r") as z:
        return [n for n in z.getnames() if n.strip("/")]


def _safe_extract_zip(z: zipfile.ZipFile, dest_dir: Path) -> None:
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


def _safe_extract_7z(z: py7zr.SevenZipFile, dest_dir: Path) -> None:
    """Same zip-slip/zip-bomb checks as _safe_extract_zip, for .7z archives."""
    total_size = 0
    resolved_dest = dest_dir.resolve()
    for info in z.list():
        total_size += info.uncompressed
        if total_size > MAX_UNCOMPRESSED_BYTES:
            raise ModInstallError("This archive is too large to be a legitimate mod (over 1 GB uncompressed).")

        member_path = (dest_dir / info.filename).resolve()
        if member_path != resolved_dest and resolved_dest not in member_path.parents:
            raise ModInstallError(f"Archive contains an unsafe path ('{info.filename}') and was rejected.")

    z.extractall(path=dest_dir)


def _safe_extract_archive(path: Path, dest_dir: Path) -> None:
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as z:
            _safe_extract_zip(z, dest_dir)
    else:
        with py7zr.SevenZipFile(path, "r") as z:
            _safe_extract_7z(z, dest_dir)


def _sole_top_level_name(names: list[str], prefix: str) -> str | None:
    top_levels = {
        n[len(prefix) :].split("/", 1)[0] for n in names if n.startswith(prefix) and n[len(prefix) :].strip("/")
    }
    return next(iter(top_levels)) if len(top_levels) == 1 else None


def _detect_ue4ss_prefix(names: list[str]) -> str:
    """Returns the "Pal/Binaries/Win64/Mods/" (or ".../ue4ss/Mods/") prefix if
    the archive's entry names all share it, so callers can look past it, or ""
    if the archive doesn't match either known shape. Bails out untouched the
    moment any level doesn't match, so this never mis-fires on an archive with
    a genuinely different structure."""
    prefix = ""
    for expected in _FIXED_PREFIX_SEGMENTS:
        candidate = _sole_top_level_name(names, prefix)
        if candidate is None or candidate.lower() != expected:
            return ""
        prefix += candidate + "/"

    candidate = _sole_top_level_name(names, prefix)
    if candidate is None:
        return ""
    if candidate.lower() == _OPTIONAL_MODLOADER_SEGMENT:
        prefix += candidate + "/"
        candidate = _sole_top_level_name(names, prefix)
        if candidate is None:
            return ""
    if candidate.lower() != _MODS_SEGMENT:
        return ""
    return prefix + candidate + "/"


def _detect_paks_prefix(names: list[str]) -> str:
    """Same idea as _detect_ue4ss_prefix, for archives that package the full
    "Pal/Content/Paks/~mods/" path of a pak-based content mod instead of just
    the mod's own folder or .pak file."""
    prefix = ""
    for expected in _PAKS_PREFIX_SEGMENTS:
        candidate = _sole_top_level_name(names, prefix)
        if candidate is None or candidate.lower() != expected:
            return ""
        prefix += candidate + "/"

    candidate = _sole_top_level_name(names, prefix)
    if candidate is None or candidate.lower() != _PAKS_MODS_SEGMENT:
        return ""
    return prefix + candidate + "/"


def _detect_game_path_prefix(names: list[str]) -> str:
    return _detect_ue4ss_prefix(names) or _detect_paks_prefix(names)


def detect_mod_kind(archive_path: Path) -> str:
    """Classifies an archive as a "pak" (raw .pak content mod, mounted
    directly by the game - goes in Pal/Content/Paks/~mods) or "ue4ss" (a Lua/
    Blueprint mod loaded by UE4SS, including PalSchema itself - goes in
    Pal/Binaries/Win64/ue4ss/Mods) so callers can route it to the right
    folder. Presence of any .pak file anywhere in the archive is decisive:
    real UE4SS mods never ship one, and pak mods are sometimes bundled
    alongside a readme/license with no other distinguishing structure."""
    names = _archive_names(archive_path)
    return "pak" if any(n.lower().endswith(".pak") for n in names) else "ue4ss"


def peek_archive_name(archive_path: Path, fallback_name: str) -> str:
    """Looks at an archive's own entry names to guess the mod's name without
    extracting anything yet - same "single common top-level folder" rule
    extract_and_install uses, so the name shown in a pre-install confirmation
    matches the folder name actually created a moment later."""
    names = _archive_names(archive_path)
    prefix = _detect_game_path_prefix(names)
    candidate = _sole_top_level_name(names, prefix)
    return _sanitize_name(candidate) if candidate is not None else _sanitize_name(fallback_name)


def extract_and_install(archive_path: Path, mods_path: Path, fallback_name: str) -> str:
    """Extracts the archive and places its mod folder inside mods_path (enabled).

    Returns the folder name used, so it can be recorded and reused for
    enable/disable/remove later.
    """
    mods_path.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        _safe_extract_archive(archive_path, tmp_path)
        prefix = _detect_game_path_prefix(_archive_names(archive_path))

        effective_root = tmp_path
        for segment in prefix.strip("/").split("/") if prefix else []:
            effective_root = effective_root / segment

        entries = list(effective_root.iterdir())
        if len(entries) == 1 and entries[0].is_dir():
            source_dir = entries[0]
            folder_name = _sanitize_name(source_dir.name)
        else:
            folder_name = _sanitize_name(fallback_name)
            source_dir = effective_root

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


def list_untracked_entries(
    mods_path: Path, tracked_names: set[str], exclude_names: set[str] = frozenset()
) -> list[str]:
    """Top-level entries sitting directly in mods_path that aren't already
    tracked in mods_store (by folderName) and aren't something else's
    bookkeeping (e.g. UE4SS's own built-in mods/files) - i.e. mods a user
    dropped in by hand instead of through this app (TICKET-0146), which
    otherwise silently never show up in the Mods page at all."""
    if not mods_path.is_dir():
        return []
    return sorted(
        entry.name
        for entry in mods_path.iterdir()
        if entry.name not in tracked_names and entry.name not in exclude_names and entry.name != "enabled.txt"
    )
