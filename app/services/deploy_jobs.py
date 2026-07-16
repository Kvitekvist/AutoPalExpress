"""Runs a fresh server deployment (SteamCMD install + initial settings +
instance registration) as a background task, since the SteamCMD download can
take several minutes. The frontend polls get_job() for live progress.
"""

import asyncio
import logging
import re
import uuid
from pathlib import Path
from typing import Any

from app.paths import default_servers_dir
from app.services import instance_store, palworld_settings, steamcmd
from app.services.steamcmd import SteamCmdError

logger = logging.getLogger("palworld_admin.deploy_jobs")

_jobs: dict[str, dict[str, Any]] = {}
_MAX_LOG_LINES = 300


def _sanitize_server_folder_name(name: str) -> str:
    """A server's own folder name, derived from what the user typed. Strips
    anything that isn't a safe filename character, then strips leading/
    trailing dots and spaces too - character-class filtering alone still
    lets a name of exactly "." or ".." straight through (both are made only
    of otherwise-allowed characters), which would resolve to the servers
    folder itself or its parent."""
    cleaned = re.sub(r"[^A-Za-z0-9 _.\-]", "", name).strip(". ")
    return cleaned or "Server"


def install_dir_for(name: str, parent_dir: Path | None = None) -> Path:
    """Every new deployment gets its own sanitized folder name. By default it
    lives under Documents\\AutoPalExpress\\Servers; super admins may choose a
    different existing parent folder for large installs or alternate drives."""
    base = parent_dir or default_servers_dir()
    return base / _sanitize_server_folder_name(name)


def default_install_dir(name: str) -> Path:
    return install_dir_for(name)


def get_job(job_id: str) -> dict[str, Any] | None:
    return _jobs.get(job_id)


def _append(job_id: str, line: str) -> None:
    job = _jobs.get(job_id)
    if not job:
        return
    job["log"].append(line)
    if len(job["log"]) > _MAX_LOG_LINES:
        job["log"] = job["log"][-_MAX_LOG_LINES:]


async def _run_deploy(
    job_id: str, *, name: str, install_dir: Path, game_port: int, rcon_port: int, max_players: int
) -> None:
    try:
        _append(job_id, "Preparing SteamCMD...")
        await steamcmd.install_palserver(install_dir, on_output=lambda line: _append(job_id, line))

        _append(job_id, "Writing initial server settings...")
        palworld_settings.initialize_settings(
            install_dir,
            server_name=name,
            game_port=game_port,
            rcon_port=rcon_port,
            max_players=max_players,
        )

        instance = instance_store.create_instance(
            name=name,
            server_path=str(install_dir),
            source="deployed",
            game_port=game_port,
            rcon_port=rcon_port,
        )
        _append(job_id, "Done.")
        _jobs[job_id]["instanceId"] = instance["id"]
        _jobs[job_id]["status"] = "done"
    except SteamCmdError as e:
        logger.warning("deploy_jobs: job %s failed: %s", job_id, e.message)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = e.message
    except OSError as e:
        logger.exception("deploy_jobs: job %s failed", job_id)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(e)


def start_deploy(*, name: str, install_dir: Path, game_port: int, rcon_port: int, max_players: int) -> str:
    job_id = f"deploy-{uuid.uuid4().hex[:10]}"
    _jobs[job_id] = {"status": "running", "log": [], "error": None, "instanceId": None}
    asyncio.create_task(
        _run_deploy(
            job_id,
            name=name,
            install_dir=install_dir,
            game_port=game_port,
            rcon_port=rcon_port,
            max_players=max_players,
        )
    )
    return job_id
