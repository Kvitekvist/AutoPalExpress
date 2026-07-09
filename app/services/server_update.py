"""SteamCMD-backed update checks and update jobs for managed Palworld servers."""

import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any

from app.services import steamcmd
from app.services.steamcmd import SteamCmdError

logger = logging.getLogger("palworld_admin.server_update")

_jobs: dict[str, dict[str, Any]] = {}
_MAX_LOG_LINES = 300


def _append(job_id: str, line: str) -> None:
    job = _jobs.get(job_id)
    if not job:
        return
    job["log"].append(line)
    if len(job["log"]) > _MAX_LOG_LINES:
        job["log"] = job["log"][-_MAX_LOG_LINES:]


async def check_for_update(instance: dict[str, Any]) -> dict[str, Any]:
    install_dir = Path(instance["serverPath"])
    installed = await asyncio.to_thread(steamcmd.installed_build_id, install_dir)
    latest = await steamcmd.latest_public_build_id()
    return {
        "installedBuildId": installed,
        "latestBuildId": latest,
        "updateAvailable": bool(installed and latest and installed != latest),
        "canCompare": bool(installed and latest),
    }


async def _run_update(job_id: str, instance: dict[str, Any]) -> None:
    try:
        _append(job_id, "Checking installed and latest Steam build ids...")
        before = await check_for_update(instance)
        _jobs[job_id]["installedBuildId"] = before["installedBuildId"]
        _jobs[job_id]["latestBuildId"] = before["latestBuildId"]

        _append(job_id, "Running SteamCMD update/validate...")
        await steamcmd.install_palserver(Path(instance["serverPath"]), on_output=lambda line: _append(job_id, line))

        after = await check_for_update(instance)
        _jobs[job_id]["installedBuildId"] = after["installedBuildId"]
        _jobs[job_id]["latestBuildId"] = after["latestBuildId"]
        _jobs[job_id]["status"] = "done"
        _append(job_id, "Update complete.")
    except SteamCmdError as e:
        logger.warning("server_update: job %s failed: %s", job_id, e.message)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = e.message
    except OSError as e:
        logger.exception("server_update: job %s failed", job_id)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(e)


def start_update(instance: dict[str, Any]) -> str:
    job_id = f"update-{uuid.uuid4().hex[:10]}"
    _jobs[job_id] = {
        "status": "running",
        "log": [],
        "error": None,
        "installedBuildId": None,
        "latestBuildId": None,
    }
    asyncio.create_task(_run_update(job_id, instance))
    return job_id


def get_job(job_id: str) -> dict[str, Any] | None:
    return _jobs.get(job_id)
