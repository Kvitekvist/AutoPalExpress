"""Reads AutoPalExpress' own packaged console log.

In the packaged app, desktop_app.py tees stdout/stderr to backend.log while
also leaving the console visible. The web UI reads this file for the
"AutoPalExpress" log column. In source/dev runs the file may not exist yet,
which is a normal empty state.
"""

from pathlib import Path

from app.paths import data_dir

_MAX_LINES = 500


def _paths() -> list[Path]:
    return [
        data_dir() / "backend.log",
        Path.cwd() / "backend.log",
    ]


def read_tail(limit: int = _MAX_LINES) -> list[str]:
    for path in _paths():
        if not path.is_file():
            continue
        try:
            return path.read_text(encoding="utf-8", errors="replace").splitlines()[-limit:]
        except OSError:
            continue
    return []
