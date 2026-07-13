"""Resolves where this app reads/writes data, aware of two very different
run modes:

- Dev (`python Palworld_Server.py` / uvicorn --reload): data lives in the
  project's own `data/` folder, same as always.
- Frozen (packaged via PyInstaller into a onefile .exe): the executable
  unpacks itself into a fresh temp folder every launch, so anything written
  under that path (sys._MEIPASS) is gone the moment the process exits. User
  data instead has to live somewhere stable across runs. It lives under the
  current user's real Documents folder (TICKET-0129) - visible and easy to
  find, and independent of wherever the program itself got installed (which
  may not even be writable without admin rights, e.g. Program Files).
  Earlier builds used %LOCALAPPDATA%\\PalworldServerAdmin\\data, then
  briefly a `data` folder inside the install folder itself (TICKET-0123).
  detect_legacy_data_dir()/migrate_data_dir() (TICKET-0130) let the caller
  ask the user whether to carry either of those forward, rather than
  migrating automatically and silently.

Bundled *read-only* resources (the built frontend) are the opposite: those
only ever need to be read from wherever PyInstaller actually extracted them.
"""

import sys
from pathlib import Path

# Historical folder name pre-TICKET-0123/0127 versions used under
# %LOCALAPPDATA%. Must stay exactly "PalworldServerAdmin" - it has to keep
# matching the literal folder name old installs actually used on disk, or
# detect_legacy_data_dir() would silently stop finding anyone's existing
# data. Not related to the app's current AutoPalExpress branding.
_LEGACY_APP_DIR_NAME = "PalworldServerAdmin"


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False))


def _documents_dir() -> Path:
    """The current user's real Documents folder, honoring redirection (e.g.
    OneDrive) - SHGetFolderPathW/CSIDL_PERSONAL is the standard Win32 way to
    ask for it rather than assuming the plain `~\\Documents` path."""
    try:
        import ctypes

        CSIDL_PERSONAL = 5
        SHGFP_TYPE_CURRENT = 0
        buf = ctypes.create_unicode_buffer(260)
        ctypes.windll.shell32.SHGetFolderPathW(0, CSIDL_PERSONAL, 0, SHGFP_TYPE_CURRENT, buf)
        if buf.value:
            return Path(buf.value)
    except Exception:
        pass
    return Path.home() / "Documents"


def documents_data_dir() -> Path:
    """Where data_dir() resolves to when frozen - without data_dir()'s
    mkdir side effect, so callers can check whether a migrate-or-start-fresh
    decision has already been made (the folder exists either way once it
    has) without that check itself creating the folder."""
    return _documents_dir() / "AutoPalExpress" / "data"


def _legacy_appdata_data_dir() -> Path:
    import os

    return Path(os.environ.get("LOCALAPPDATA", Path.home())) / _LEGACY_APP_DIR_NAME / "data"


def _legacy_install_folder_data_dir() -> Path:
    # TICKET-0123's short-lived "data lives inside the install folder" era.
    return install_dir() / "data"


def detect_legacy_data_dir() -> Path | None:
    """Looks for real data from an older version, without touching anything.
    Checks TICKET-0123's install-folder location first, then the original
    pre-0123 %LOCALAPPDATA% location. Returns None if neither has anything -
    including on a fresh install, or once a previous launch has already
    resolved this (see documents_data_dir())."""
    if not is_frozen():
        return None
    for candidate in (_legacy_install_folder_data_dir(), _legacy_appdata_data_dir()):
        if candidate.is_dir():
            return candidate
    return None


def migrate_data_dir(legacy_dir: Path) -> Path:
    """Moves a legacy data folder (as found by detect_legacy_data_dir()) into
    the current Documents-based location. Caller's responsibility to only
    call this after the user has actually agreed to it."""
    new_dir = documents_data_dir()
    new_dir.parent.mkdir(parents=True, exist_ok=True)

    import shutil

    shutil.move(str(legacy_dir), str(new_dir))
    return new_dir


def data_dir() -> Path:
    if is_frozen():
        base = documents_data_dir()
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
    """The real, stable folder the installer put AutoPalExpress.exe in -
    NOT the same as resource_dir(), which for a frozen onefile build is a
    fresh temp extraction folder that's gone the moment the process exits.
    This is where the installer writes its one-time first-run seed file, so
    the app has to look in the same stable place to find it."""
    if is_frozen():
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent
