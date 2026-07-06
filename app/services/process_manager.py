"""Starts, stops, and reports on the actual PalServer.exe process for a
server instance.

Tracking is in-memory only, keyed by instance id - it only knows about
servers started through this tool during the current run of this backend. A
server started outside the tool (or a stale one left running from a previous
backend process) won't show as online here; this is a scoped MVP, not full
process discovery/adoption.
"""

import logging
import signal
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

import psutil

from app.services import instance_store, palworld_settings

logger = logging.getLogger("palworld_admin.process_manager")

_STARTUP_GRACE_SECONDS = 15

_lock = threading.Lock()
_processes: dict[str, subprocess.Popen] = {}
_started_at: dict[str, float] = {}
_stopping: set[str] = set()


class ProcessError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _exe_path(instance: dict[str, Any]) -> Path:
    return Path(instance["serverPath"]) / "PalServer.exe"


def _is_alive(instance_id: str) -> bool:
    proc = _processes.get(instance_id)
    return bool(proc and proc.poll() is None)


def start(instance: dict[str, Any]) -> None:
    instance_id = instance["id"]
    with _lock:
        if _is_alive(instance_id):
            raise ProcessError("This server is already running.")

        exe = _exe_path(instance)
        if not exe.is_file():
            raise ProcessError(f"PalServer.exe wasn't found at '{exe}'.")

        game_port = palworld_settings.enforce_game_port(exe.parent, instance["gamePort"])
        if game_port != instance["gamePort"]:
            instance_store.update_game_port(instance_id, game_port)
        proc = subprocess.Popen(
            [
                str(exe),
                f"-port={game_port}",
                "-useperfthreads",
                "-NoAsyncLoadingThread",
                "-UseMultithreadForDS",
            ],
            cwd=str(exe.parent),
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
        _processes[instance_id] = proc
        _started_at[instance_id] = time.time()
        _stopping.discard(instance_id)
        logger.info("process_manager: started %r (pid=%s, port=%s)", instance["name"], proc.pid, game_port)


def stop(instance_id: str, timeout: float = 30) -> None:
    with _lock:
        proc = _processes.get(instance_id)
        if not proc or proc.poll() is not None:
            _processes.pop(instance_id, None)
            _started_at.pop(instance_id, None)
            _stopping.discard(instance_id)
            return
        _stopping.add(instance_id)

    logger.info("process_manager: stopping pid=%s", proc.pid)

    # PalServer.exe is a launcher, not the real game process (see
    # _tree_cpu_ram) - the launcher exiting doesn't stop its child, so the
    # whole tree has to be tracked and killed explicitly or the actual game
    # process is orphaned, still running, still holding the port.
    try:
        tree = [psutil.Process(proc.pid), *psutil.Process(proc.pid).children(recursive=True)]
    except psutil.Error:
        tree = []

    try:
        proc.send_signal(signal.CTRL_BREAK_EVENT)
    except (OSError, ValueError):
        pass

    deadline = time.time() + timeout
    while proc.poll() is None and time.time() < deadline:
        time.sleep(0.5)

    still_alive = [p for p in tree if p.is_running()]
    if still_alive:
        if proc.poll() is None:
            logger.warning(
                "process_manager: pid=%s didn't exit gracefully within %ss, killing its process tree",
                proc.pid,
                timeout,
            )
        else:
            logger.warning("process_manager: launcher pid=%s exited but left child processes running, killing them", proc.pid)
        for p in still_alive:
            try:
                p.kill()
            except psutil.Error:
                pass
        psutil.wait_procs(still_alive, timeout=10)

    if proc.poll() is None:
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass

    with _lock:
        _processes.pop(instance_id, None)
        _started_at.pop(instance_id, None)
        _stopping.discard(instance_id)
    logger.info("process_manager: stopped pid=%s", proc.pid)


def _tree_cpu_ram(pid: int) -> tuple[float, float]:
    """PalServer.exe is a thin launcher that spawns the real game process
    (PalServer-Win64-Shipping-Cmd.exe) as a child - almost all CPU/RAM shows
    up there, not on the launcher's own PID, so this sums the whole tree."""
    try:
        root = psutil.Process(pid)
    except psutil.Error:
        return 0.0, 0.0

    try:
        procs = [root, *root.children(recursive=True)]
    except psutil.Error:
        procs = [root]

    cpu_percent = 0.0
    ram_bytes = 0
    for p in procs:
        try:
            cpu_percent += p.cpu_percent(interval=0.1)
            ram_bytes += p.memory_info().rss
        except psutil.Error:
            continue
    # psutil reports cpu_percent() relative to a single core (100% = one
    # core fully busy), but Task Manager normalizes to all cores (100% =
    # the whole CPU maxed out) - without dividing by core count, this
    # number reads as inflated by however many cores the machine has.
    cpu_percent /= psutil.cpu_count() or 1
    return cpu_percent, ram_bytes / (1024**3)


def get_status(instance_id: str) -> dict[str, Any]:
    if instance_id in _stopping:
        return {"state": "stopping", "uptimeSeconds": 0, "cpuPercent": 0.0, "ramUsedGB": 0.0}

    if not _is_alive(instance_id):
        return {"state": "offline", "uptimeSeconds": 0, "cpuPercent": 0.0, "ramUsedGB": 0.0}

    started_at = _started_at.get(instance_id, time.time())
    uptime = time.time() - started_at
    state = "starting" if uptime < _STARTUP_GRACE_SECONDS else "online"

    proc = _processes[instance_id]
    cpu_percent, ram_gb = _tree_cpu_ram(proc.pid)

    return {
        "state": state,
        "uptimeSeconds": int(uptime),
        "cpuPercent": round(cpu_percent, 1),
        "ramUsedGB": round(ram_gb, 2),
    }
