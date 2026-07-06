"""Locates a Palworld Dedicated Server installed via Steam by reading the
Steam install path out of the Windows registry, then scanning every Steam
library folder listed in libraryfolders.vdf for the PalServer app.
"""

import logging
import re
from pathlib import Path

try:
    import winreg
except ImportError:  # pragma: no cover - only missing off Windows
    winreg = None  # type: ignore[assignment]

logger = logging.getLogger("palworld_admin.steam_locator")

APP_ID = "2394010"
EXE_NAME = "PalServer.exe"


def _steam_install_path() -> Path | None:
    if winreg is not None:
        for hive, subkey, value_name in (
            (winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam", "SteamPath"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam", "InstallPath"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Valve\Steam", "InstallPath"),
        ):
            try:
                with winreg.OpenKey(hive, subkey) as key:
                    raw, _ = winreg.QueryValueEx(key, value_name)
                    path = Path(raw)
                    if path.is_dir():
                        return path
            except OSError:
                continue

    for candidate in (
        Path("C:/Program Files (x86)/Steam"),
        Path("C:/Program Files/Steam"),
    ):
        if candidate.is_dir():
            return candidate
    return None


def _parse_library_folders(vdf_path: Path) -> list[Path]:
    if not vdf_path.is_file():
        return []
    text = vdf_path.read_text(encoding="utf-8", errors="ignore")
    return [Path(p) for p in re.findall(r'"path"\s+"([^"]+)"', text)]


def _library_folders() -> list[Path]:
    steam_path = _steam_install_path()
    if not steam_path:
        return []
    libraries = [steam_path]
    for lib in _parse_library_folders(steam_path / "steamapps" / "libraryfolders.vdf"):
        if lib not in libraries:
            libraries.append(lib)
    return libraries


def _installdir_for(steamapps: Path) -> str:
    manifest = steamapps / f"appmanifest_{APP_ID}.acf"
    if manifest.is_file():
        text = manifest.read_text(encoding="utf-8", errors="ignore")
        match = re.search(r'"installdir"\s+"([^"]+)"', text)
        if match:
            return match.group(1)
    return "PalServer"


def find_install_path() -> Path | None:
    """Returns the PalServer install folder if a Steam library has it, else None."""
    libraries = _library_folders()
    logger.info("steam_locator: scanning %d Steam librar%s", len(libraries), "y" if len(libraries) == 1 else "ies")
    for lib in libraries:
        steamapps = lib / "steamapps"
        candidate = steamapps / "common" / _installdir_for(steamapps)
        if (candidate / EXE_NAME).is_file():
            logger.info("steam_locator: found PalServer at %s", candidate)
            return candidate
    logger.info("steam_locator: no PalServer install found in any Steam library")
    return None
