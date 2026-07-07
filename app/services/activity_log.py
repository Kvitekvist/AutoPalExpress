"""Real activity feed behind the Logs page - not Palworld's own console text
(confirmed unreachable: no stdout output, no log file even with -log passed,
and the console itself turned out to be a Dear ImGui overlay rather than a
real text buffer - see memory/decisions.md), but real events this app
already knows about or performs directly: server start/stop, player
join/leave, kick/ban, and scheduled automation firing.

Persisted as JSON Lines (data_dir()/activity_log.jsonl) so history survives
an app restart, not just kept in memory - capped and periodically trimmed
so it doesn't grow forever.
"""

import json
import logging
import threading
import uuid
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from app.paths import data_dir

logger = logging.getLogger("palworld_admin.activity_log")

LogLevel = Literal["info", "warning", "error", "debug"]

_MAX_ENTRIES = 2000
_TRIM_CHECK_EVERY = 50
_TRIM_FILE_SIZE_BYTES = 2_000_000

_lock = threading.Lock()
_entries: deque[dict[str, Any]] = deque(maxlen=_MAX_ENTRIES)
_loaded = False
_writes_since_trim = 0


def _log_path() -> Path:
    return data_dir() / "activity_log.jsonl"


def _load_once() -> None:
    global _loaded
    if _loaded:
        return
    _loaded = True
    path = _log_path()
    if not path.is_file():
        return
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    for line in lines[-_MAX_ENTRIES:]:
        try:
            _entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue


def _trim_file_if_needed() -> None:
    global _writes_since_trim
    _writes_since_trim += 1
    if _writes_since_trim < _TRIM_CHECK_EVERY:
        return
    _writes_since_trim = 0
    path = _log_path()
    try:
        if path.stat().st_size < _TRIM_FILE_SIZE_BYTES:
            return
        lines = path.read_text(encoding="utf-8").splitlines()
        path.write_text("\n".join(lines[-_MAX_ENTRIES:]) + "\n", encoding="utf-8")
    except OSError:
        pass


def log(level: LogLevel, source: str, message: str) -> None:
    with _lock:
        _load_once()
        entry = {
            "id": uuid.uuid4().hex,
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "source": source,
            "message": message,
        }
        _entries.append(entry)
        try:
            with open(_log_path(), "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
            _trim_file_if_needed()
        except OSError:
            logger.warning("activity_log: couldn't persist entry to disk")


def get_all() -> list[dict[str, Any]]:
    """Newest first, matching how the Logs page has always displayed them."""
    with _lock:
        _load_once()
        return list(reversed(_entries))
