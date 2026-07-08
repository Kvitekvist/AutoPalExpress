"""One-time provisioning from the installer's collected answers (super admin
account, optional initial server name) - lets a fresh install finish
setup automatically on first launch instead of the user re-entering the
same things they already gave the installer.

The installer writes a plaintext seed file (install_dir()/first_run_seed.json)
with the collected answers. This applies them once, at startup, using the
exact same code paths the UI itself would call (so there's no separate
account-creation/deploy logic to keep in sync), then deletes the
seed file - on both success and failure, since it holds a plaintext
password and shouldn't linger on disk regardless of how setup went. Every
step here has a manual fallback already built into the app (the normal
first-visit Setup screen, Deploy Server Wizard),
so a failure at any one step is a degraded first run, not a broken one.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from app.paths import data_dir, install_dir
from app.services import auth, deploy_jobs, nexus_client, nexus_session
from app.services.auth import AuthError
from app.services.nexus_client import NexusApiError

logger = logging.getLogger("palworld_admin.first_run_setup")

SEED_FILE_NAME = "first_run_seed.json"
PROGRESS_FILE_NAME = "first_run_progress.log"


def _seed_path() -> Path:
    return install_dir() / SEED_FILE_NAME


def progress_path() -> Path:
    """Where the installer's own progress page tails live output from -
    exposed as a function (not a constant) since data_dir() itself isn't
    stable until first called (it creates the folder on demand)."""
    return data_dir() / PROGRESS_FILE_NAME


def _log(message: str) -> None:
    logger.info("first_run_setup: %s", message)
    try:
        with open(progress_path(), "a", encoding="utf-8") as f:
            f.write(message + "\n")
    except OSError:
        pass


async def _wait_for_deploy(job_id: str) -> None:
    seen = 0
    while True:
        job = deploy_jobs.get_job(job_id)
        if not job:
            return
        for line in job["log"][seen:]:
            _log(line)
        seen = len(job["log"])
        if job["status"] == "done":
            _log("Server deployed successfully.")
            return
        if job["status"] == "error":
            _log(f"Server deployment failed: {job.get('error')}. You can deploy it manually from Super Admin instead.")
            return
        await asyncio.sleep(1)


async def apply_seed_if_present() -> None:
    seed_path = _seed_path()
    if not seed_path.is_file():
        return

    try:
        seed: dict[str, Any] = json.loads(seed_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("first_run_setup: couldn't read seed file, skipping: %s", e)
        seed_path.unlink(missing_ok=True)
        return

    progress_path().unlink(missing_ok=True)  # fresh log for this run
    _log("Starting first-time setup...")

    username = seed.get("superAdminUsername")
    password = seed.get("superAdminPassword")
    if username and password:
        try:
            auth.create_first_super_admin(username, password)
            _log(f"Created super admin account '{username}'.")
        except AuthError as e:
            _log(f"Couldn't create the super admin account automatically: {e.message}")

    api_key = seed.get("nexusApiKey")
    if api_key:
        try:
            data = await nexus_client.validate_key(api_key)
            nexus_session.save_record(
                {
                    "connected": True,
                    "apiKey": api_key,
                    "username": data.get("name"),
                    "userId": data.get("user_id"),
                    "isPremium": bool(data.get("is_premium")),
                }
            )
            _log(f"Connected Nexus Mods account: {data.get('name')}.")
        except NexusApiError as e:
            _log(f"Couldn't verify the Nexus Mods API key: {e.message}")

    server_name = seed.get("serverName")
    if server_name:
        try:
            install_parent = seed.get("serverInstallParentDir")
            install_path = deploy_jobs.install_dir_for(
                server_name,
                Path(install_parent) if install_parent and Path(install_parent).is_dir() else None,
            )
            _log(f"Deploying '{server_name}'...")
            job_id = deploy_jobs.start_deploy(
                name=server_name,
                install_dir=install_path,
                game_port=8211,
                rcon_port=8212,
                max_players=32,
            )
            await _wait_for_deploy(job_id)
        except OSError as e:
            logger.exception("first_run_setup: deploy failed")
            _log(f"Server deployment failed: {e}. You can deploy it manually from Super Admin instead.")

    _log("DONE")
    seed_path.unlink(missing_ok=True)
