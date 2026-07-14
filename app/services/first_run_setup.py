"""One-time provisioning from the installer's collected answers (just the
super admin account) - lets a fresh install finish setup automatically on
first launch instead of the user re-entering what they already gave the
installer.

The installer writes a plaintext seed file (install_dir()/first_run_seed.json)
with the collected answers. This applies them once, at startup, using the
exact same code path the UI itself would call, then deletes the seed file -
on both success and failure, since it holds a plaintext password and
shouldn't linger on disk regardless of how setup went.

Server creation deliberately isn't part of this (TICKET-0132): it used to
run as a fire-and-forget background SteamCMD deploy here, with no reliable
way for the app's own UI to know it had actually finished - the app now
forces the super admin to create their first server through its own
already-reliable Deploy/Import flow the first time they log in instead.
"""

import json
import logging
from pathlib import Path
from typing import Any

from app.paths import data_dir, install_dir
from app.services import auth
from app.services.auth import AuthError

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

    _log("DONE")
    seed_path.unlink(missing_ok=True)
