"""Reads AutoPalExpress' own packaged console log.

In the packaged app, desktop_app.py tees stdout/stderr to backend.log while
also leaving the console visible. The web UI reads this file for the
"AutoPalExpress" log column. In source/dev runs the file may not exist yet,
which is a normal empty state.
"""

import re
from pathlib import Path

from app.paths import data_dir

_MAX_LINES = 500

# Matches uvicorn access-log client addresses (e.g. "203.0.113.5:54321 - ...")
# as well as any other IPv4 literal that ends up in the app's own stdout/stderr.
_IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_IP_MASK = "•.•.•.•"


def _paths() -> list[Path]:
    return [
        data_dir() / "backend.log",
        Path.cwd() / "backend.log",
    ]


def read_tail(limit: int = _MAX_LINES, mask_ips: bool = False) -> list[str]:
    """Newest first, matching how activity_log.get_all() orders the other Logs page column.

    Only the super admin should see real host/client IPs from this console
    output - regular admins get every IPv4 literal replaced with a mask.
    """
    for path in _paths():
        if not path.is_file():
            continue
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()[-limit:]
        except OSError:
            continue
        lines = list(reversed(lines))
        if mask_ips:
            lines = [_IPV4_RE.sub(_IP_MASK, line) for line in lines]
        return lines
    return []
