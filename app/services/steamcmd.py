"""Bootstraps SteamCMD and uses it to install a standalone, isolated copy of
the Palworld Dedicated Server (anonymous login - the dedicated server is
free and doesn't require an owned Steam license). Each install goes into its
own folder, so multiple instances never share files or mods.
"""

import asyncio
import logging
import re
import zipfile
from collections.abc import Callable
from pathlib import Path

import httpx

from app.paths import data_dir

logger = logging.getLogger("palworld_admin.steamcmd")

STEAMCMD_DIR = data_dir() / "steamcmd"
STEAMCMD_DIR.mkdir(parents=True, exist_ok=True)
STEAMCMD_EXE = STEAMCMD_DIR / "steamcmd.exe"
STEAMCMD_ZIP_URL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip"

PALSERVER_APP_ID = "2394010"
_PUBLIC_BUILD_RE = re.compile(r'"public"\s*\{.*?"buildid"\s*"(?P<buildid>\d+)"', re.DOTALL)


class SteamCmdError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


async def _run(args: list[str], on_output: Callable[[str], None] | None = None) -> int:
    logger.info("steamcmd: running %s", " ".join(args))
    process = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
    )
    assert process.stdout is not None
    async for raw_line in process.stdout:
        line = raw_line.decode(errors="replace").rstrip()
        if line:
            logger.info("steamcmd: %s", line)
            if on_output:
                on_output(line)
    return await process.wait()


async def ensure_steamcmd() -> Path:
    if STEAMCMD_EXE.is_file():
        return STEAMCMD_EXE

    logger.info("steamcmd: bootstrapping from %s", STEAMCMD_ZIP_URL)
    zip_path = STEAMCMD_DIR / "steamcmd.zip"
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            resp = await client.get(STEAMCMD_ZIP_URL)
            resp.raise_for_status()
            zip_path.write_bytes(resp.content)
    except httpx.HTTPError as e:
        raise SteamCmdError(f"Couldn't download SteamCMD: {e}")

    try:
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(STEAMCMD_DIR)
    except zipfile.BadZipFile:
        raise SteamCmdError("The downloaded SteamCMD archive was corrupt. Try again.")
    finally:
        zip_path.unlink(missing_ok=True)

    if not STEAMCMD_EXE.is_file():
        raise SteamCmdError("Downloaded SteamCMD, but steamcmd.exe wasn't found after extracting it.")

    # SteamCMD's very first run always self-updates and commonly exits with a
    # non-zero code when it does (this is normal, not a failure) - prime it
    # here so the real install command below runs against an up-to-date,
    # quiescent SteamCMD instead of hitting that mid-command.
    logger.info("steamcmd: priming first-run self-update")
    await _run([str(STEAMCMD_EXE), "+quit"])
    return STEAMCMD_EXE


async def install_palserver(install_dir: Path, on_output: Callable[[str], None] | None = None) -> None:
    """Runs SteamCMD to install (or update/repair) a standalone PalServer
    copy into install_dir. Streams SteamCMD's own output line-by-line via
    on_output so callers can show live progress for what is normally a
    multi-minute, multi-gigabyte download."""
    exe = await ensure_steamcmd()
    install_dir.mkdir(parents=True, exist_ok=True)

    args = [
        str(exe),
        "+force_install_dir",
        str(install_dir),
        "+login",
        "anonymous",
        "+app_update",
        PALSERVER_APP_ID,
        "validate",
        "+quit",
    ]

    returncode = await _run(args, on_output)
    if returncode != 0:
        # A SteamCMD self-update can still land here on the very first
        # real command after a fresh bootstrap - retry once before giving up.
        logger.warning("steamcmd: exited %s, retrying once (self-update is a common first-run cause)", returncode)
        if on_output:
            on_output("SteamCMD self-updated - retrying the install...")
        returncode = await _run(args, on_output)
        if returncode != 0:
            raise SteamCmdError(f"SteamCMD exited with code {returncode}. Check the deploy log for details.")

    if not (install_dir / "PalServer.exe").is_file():
        raise SteamCmdError("SteamCMD finished, but PalServer.exe wasn't found in the install folder.")


def installed_build_id(install_dir: Path) -> str | None:
    manifest = install_dir / "steamapps" / f"appmanifest_{PALSERVER_APP_ID}.acf"
    if not manifest.is_file():
        return None
    try:
        text = manifest.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    match = re.search(r'"buildid"\s*"(?P<buildid>\d+)"', text)
    return match.group("buildid") if match else None


async def latest_public_build_id(on_output: Callable[[str], None] | None = None) -> str | None:
    exe = await ensure_steamcmd()
    lines: list[str] = []

    def collect(line: str) -> None:
        lines.append(line)
        if on_output:
            on_output(line)

    args = [
        str(exe),
        "+login",
        "anonymous",
        "+app_info_update",
        "1",
        "+app_info_print",
        PALSERVER_APP_ID,
        "+quit",
    ]
    returncode = await _run(args, collect)
    if returncode != 0:
        raise SteamCmdError(f"SteamCMD exited with code {returncode} while checking for updates.")

    output = "\n".join(lines)
    match = _PUBLIC_BUILD_RE.search(output)
    if match:
        return match.group("buildid")
    fallback = re.search(r'"buildid"\s*"(?P<buildid>\d+)"', output)
    return fallback.group("buildid") if fallback else None
