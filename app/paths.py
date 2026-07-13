"""Resolves where this app reads/writes data, aware of two very different
run modes:

- Dev (`python Palworld_Server.py` / uvicorn --reload): data lives in the
  project's own `data/` folder, same as always.
- Frozen (packaged via PyInstaller into a onefile .exe): the executable
  unpacks itself into a fresh temp folder every launch, so anything written
  under that path (sys._MEIPASS) is gone the moment the process exits. User
  data instead has to live somewhere stable across runs - a `data` folder
  next to the exe, inside the install folder the user picked, so the whole
  install stays self-contained and portable. Earlier builds used
  %LOCALAPPDATA% instead; migrate_legacy_data_if_needed() moves that over
  automatically the first time an upgraded build runs.

Bundled *read-only* resources (the built frontend) are the opposite: those
only ever need to be read from wherever PyInstaller actually extracted them.
"""

import sys
from pathlib import Path

APP_DIR_NAME = "PalworldServerAdmin"

_legacy_migration_checked = False


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False))


def _legacy_data_dir() -> Path:
    import os

    return Path(os.environ.get("LOCALAPPDATA", Path.home())) / APP_DIR_NAME / "data"


def migrate_legacy_data_if_needed() -> bool:
    """One-time move of app data from the old %LOCALAPPDATA% location into
    the install folder, for anyone upgrading from before data lived there.
    Idempotent per process (and effectively per machine, since the second
    check below short-circuits once the new folder exists) - safe to call
    from data_dir() on every access. Returns True the one time it actually
    moves something, so the caller can tell the user it happened."""
    global _legacy_migration_checked
    if _legacy_migration_checked or not is_frozen():
        return False
    _legacy_migration_checked = True

    new_dir = install_dir() / "data"
    if new_dir.exists():
        return False

    legacy_dir = _legacy_data_dir()
    if not legacy_dir.is_dir():
        return False

    import shutil

    new_dir.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(legacy_dir), str(new_dir))
    return True


def data_dir() -> Path:
    if is_frozen():
        migrate_legacy_data_if_needed()
        base = install_dir() / "data"
    else:
        base = Path(__file__).resolve().parent.parent / "data"
    base.mkdir(parents=True, exist_ok=True)
    return base


def resource_dir() -> Path:
    """Base directory for bundled read-only resources (e.g. the built frontend)."""
    if is_frozen():
        return Path(getattr(sys, "_MEIPASS"))
    return Path(__file__).resolve().parent.parent


def install_dir() -> Path:
    """The real, stable folder the installer put PalworldServerAdmin.exe in -
    NOT the same as resource_dir(), which for a frozen onefile build is a
    fresh temp extraction folder that's gone the moment the process exits.
    This is where the installer writes its one-time first-run seed file, so
    the app has to look in the same stable place to find it."""
    if is_frozen():
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent
