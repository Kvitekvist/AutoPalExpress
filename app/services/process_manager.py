"""Starts, stops, and reports on the actual PalServer.exe process for a
server instance.

Control tracking is in-memory, keyed by instance id. Status metrics also scan
for matching Palworld processes under the selected server folder so the
Dashboard can recover CPU/RAM when the launcher tree is incomplete or the
backend restarted while Palworld stayed online.
"""

import logging
import os
import signal
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

import psutil

from app.services import activity_log, instance_store, palworld_settings, public_ip, upnp

logger = logging.getLogger("palworld_admin.process_manager")

_STARTUP_GRACE_SECONDS = 15

_lock = threading.Lock()
_processes: dict[str, subprocess.Popen] = {}
_started_at: dict[str, float] = {}
_stopping: set[str] = set()
_PALWORLD_PROCESS_NAMES = {"palserver.exe", "palserver-win64-shipping-cmd.exe"}


class ProcessError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _exe_path(instance: dict[str, Any]) -> Path:
    return Path(instance["serverPath"]) / "PalServer.exe"


def _public_ip_override_value() -> str | None:
    gateway = upnp.discover_gateway()
    if gateway:
        try:
            ip = upnp.get_external_ip(gateway)
            if ip:
                return ip
        except upnp.UpnpError as e:
            logger.info("process_manager: router public IP lookup failed: %s", e.message)
    return public_ip.fetch_public_ip_sync()


def _is_alive(instance_id: str) -> bool:
    proc = _processes.get(instance_id)
    return bool(proc and proc.poll() is None)


def _path_key(path: Path | str) -> str:
    try:
        return os.path.normcase(str(Path(path).resolve()))
    except OSError:
        return os.path.normcase(str(path))


def _path_is_inside(path: str, root: str) -> bool:
    try:
        return os.path.commonpath([root, _path_key(path)]) == root
    except (OSError, ValueError):
        return False


def _safe_process_tree(pid: int) -> list[psutil.Process]:
    try:
        root = psutil.Process(pid)
    except psutil.Error:
        return []
    try:
        return [root, *root.children(recursive=True)]
    except psutil.Error:
        return [root]


def _process_matches_instance(proc: psutil.Process, server_root: str) -> bool:
    try:
        name = (proc.name() or "").lower()
    except psutil.Error:
        return False
    if name not in _PALWORLD_PROCESS_NAMES:
        return False

    for attr in (proc.exe, proc.cwd):
        try:
            value = attr()
        except psutil.Error:
            continue
        if value and _path_is_inside(value, server_root):
            return True

    try:
        cmdline = proc.cmdline()
    except psutil.Error:
        cmdline = []
    return any(_path_is_inside(part, server_root) for part in cmdline if part)


def _instance_processes(instance: dict[str, Any]) -> list[psutil.Process]:
    """Return tracked and discoverable Palworld processes for one instance.

    PalServer.exe can hand work to PalServer-Win64-Shipping-Cmd.exe, and the
    backend can also be restarted while the game keeps running. Sampling by
    instance folder lets status recover the real worker process in both cases.
    """
    seen: set[int] = set()
    processes: list[psutil.Process] = []

    tracked = _processes.get(instance["id"])
    if tracked and tracked.poll() is None:
        for proc in _safe_process_tree(tracked.pid):
            if proc.pid not in seen:
                seen.add(proc.pid)
                processes.append(proc)

    server_root = _path_key(instance["serverPath"])
    for proc in psutil.process_iter():
        if proc.pid in seen:
            continue
        if _process_matches_instance(proc, server_root):
            seen.add(proc.pid)
            processes.append(proc)

    return processes


def start(instance: dict[str, Any]) -> None:
    instance_id = instance["id"]
    with _lock:
        if _is_alive(instance_id) or _instance_processes(instance):
            raise ProcessError("This server is already running.")

        exe = _exe_path(instance)
        if not exe.is_file():
            raise ProcessError(f"PalServer.exe wasn't found at '{exe}'.")

        game_port = instance_store.resolve_game_port(instance)
        game_port = palworld_settings.enforce_game_port(exe.parent, game_port, prefer_fallback=True)
        rest_config = palworld_settings.enforce_rest_api(exe.parent, instance.get("rconPort") or 8212)
        if rest_config["passwordGenerated"]:
            logger.info("process_manager: generated AdminPassword for %r so Palworld REST API can authenticate", instance["name"])
        if game_port != instance["gamePort"]:
            instance_store.update_game_port(instance_id, game_port)
        query_port = instance_store.resolve_query_port(instance, game_port) if instance.get("useQueryPort") else None
        launch_args = [str(exe), f"-port={game_port}"]
        if query_port:
            launch_args.append(f"-queryport={query_port}")
        if instance.get("usePerfThreads", instance.get("performanceFlags", True)):
            launch_args.append("-useperfthreads")
        if instance.get("noAsyncLoadingThread", instance.get("performanceFlags", True)):
            launch_args.append("-NoAsyncLoadingThread")
        if instance.get("useMultithreadForDs", instance.get("performanceFlags", True)):
            launch_args.append("-UseMultithreadForDS")
        if instance.get("communityServer"):
            launch_args.append("-publiclobby")
        if instance.get("usePublicIpOverride"):
            public_ip_override = _public_ip_override_value()
            if public_ip_override:
                launch_args.append(f"-publicip={public_ip_override}")
            else:
                logger.warning("process_manager: -publicip override enabled, but no public IP could be detected")
        if instance.get("usePublicPortOverride"):
            launch_args.append(f"-publicport={game_port}")
        if instance.get("jsonLogFormat"):
            launch_args.append("-logformat=json")

        proc = subprocess.Popen(
            launch_args,
            cwd=str(exe.parent),
            # Keep Palworld's own server window visible so the host can see at
            # a glance that it is running. stdout/stderr still do not contain
            # the window text - Palworld renders that content through its own
            # console/overlay path rather than writing normal process output.
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
        )
        _processes[instance_id] = proc
        _started_at[instance_id] = time.time()
        _stopping.discard(instance_id)
        logger.info(
            "process_manager: started %r (pid=%s, port=%s, query_port=%s)",
            instance["name"],
            proc.pid,
            game_port,
            query_port,
        )
        if query_port:
            activity_log.log("info", instance["name"], f"Server started (port {game_port}, query port {query_port}).")
        else:
            activity_log.log("info", instance["name"], f"Server started (port {game_port}).")


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
    name = (instance_store.get(instance_id) or {}).get("name", instance_id)

    # PalServer.exe is a launcher, not always the real game process. The
    # launcher exiting doesn't stop its child, so the
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
            activity_log.log("warning", name, f"Didn't stop gracefully within {int(timeout)}s - force-killed.")
        else:
            logger.warning("process_manager: launcher pid=%s exited but left child processes running, killing them", proc.pid)
            activity_log.log("warning", name, "Launcher exited but left child processes running - killed them too.")
        for p in still_alive:
            try:
                p.kill()
            except psutil.Error:
                pass
        psutil.wait_procs(still_alive, timeout=10)
    else:
        activity_log.log("info", name, "Server stopped.")

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


def _process_cpu_ram(procs: list[psutil.Process]) -> tuple[float, float]:
    cpu_percent = 0.0
    ram_bytes = 0
    for proc in procs:
        try:
            cpu_percent += proc.cpu_percent(interval=0.1)
            ram_bytes += proc.memory_info().rss
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

    instance = instance_store.get(instance_id)
    processes = _instance_processes(instance) if instance else []

    if not processes:
        with _lock:
            _processes.pop(instance_id, None)
            _started_at.pop(instance_id, None)
        return {"state": "offline", "uptimeSeconds": 0, "cpuPercent": 0.0, "ramUsedGB": 0.0}

    started_at = _started_at.get(instance_id)
    if started_at is None:
        create_times = []
        for proc in processes:
            try:
                create_times.append(proc.create_time())
            except psutil.Error:
                continue
        started_at = min(create_times) if create_times else time.time()
    uptime = time.time() - started_at
    state = "starting" if uptime < _STARTUP_GRACE_SECONDS else "online"

    cpu_percent, ram_gb = _process_cpu_ram(processes)

    return {
        "state": state,
        "uptimeSeconds": int(uptime),
        "cpuPercent": round(cpu_percent, 1),
        "ramUsedGB": round(ram_gb, 2),
    }
