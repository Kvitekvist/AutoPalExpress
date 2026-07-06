"""Resolves where this app reads/writes data, aware of two very different
run modes:

- Dev (`python Palworld_Server.py` / uvicorn --reload): data lives in the
  project's own `data/` folder, same as always.
- Frozen (packaged via PyInstaller into a onefile .exe): the executable
  unpacks itself into a fresh temp folder every launch, so anything written
  under that path (sys._MEIPASS) is gone the moment the process exits. User
  data instead has to live somewhere stable across runs - %LOCALAPPDATA% is
  the standard place for a per-user Windows app.

Bundled *read-only* resources (the built frontend) are the opposite: those
only ever need to be read from wherever PyInstaller actually extracted them.
"""

import sys
from pathlib import Path

APP_DIR_NAME = "PalworldServerAdmin"


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False))


def data_dir() -> Path:
    if is_frozen():
        import os

        base = Path(os.environ.get("LOCALAPPDATA", Path.home())) / APP_DIR_NAME / "data"
    else:
        base = Path(__file__).resolve().parent.parent / "data"
    base.mkdir(parents=True, exist_ok=True)
    return base


def resource_dir() -> Path:
    """Base directory for bundled read-only resources (e.g. the built frontend)."""
    if is_frozen():
        return Path(getattr(sys, "_MEIPASS"))
    return Path(__file__).resolve().parent.parent
