"""Runs the packaged support diagnostics script (support/diagnose-autopalexpress.ps1)
from within the app, instead of requiring the super admin to find and run
the separate Start Menu shortcut themselves.

Firewall rule inspection needs admin rights, so this elevates the exact
same way firewall.py does - Windows shows its own UAC consent prompt,
which the user still has to approve themselves; this only saves them from
finding and double-clicking the shortcut (or typing the command) by hand.
"""

import logging
import subprocess
from pathlib import Path
from typing import Any

from app import paths

_REPORT_PREFIX = "AutoPalExpress-Diagnostics-"
logger = logging.getLogger("palworld_admin.diagnostics")


class DiagnosticsError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _script_path() -> Path:
    if paths.is_frozen():
        # installer.iss copies both support files directly beside the exe,
        # not into the PyInstaller onefile archive - sys._MEIPASS is a fresh
        # temp extraction that's gone the moment the process exits.
        return paths.install_dir() / "diagnose-autopalexpress.ps1"
    return paths.install_dir() / "support" / "diagnose-autopalexpress.ps1"


def _report_dir() -> Path:
    # Matches Diagnose-AutoPalExpress.cmd's own %LOCALAPPDATA%\PalworldServerAdmin\diagnostics
    # convention when frozen; a sibling "diagnostics" folder next to "data" when run from source.
    return paths.data_dir().parent / "diagnostics"


def run() -> dict[str, Any]:
    script = _script_path()
    if not script.is_file():
        raise DiagnosticsError(f"Diagnostics script not found at '{script}'.")

    report_dir = _report_dir()
    report_dir.mkdir(parents=True, exist_ok=True)
    data_dir = paths.data_dir()

    before = {p.name for p in report_dir.glob(f"{_REPORT_PREFIX}*.txt")}

    fallback_note = ""
    elevated = _run_elevated(script=script, data_dir=data_dir, report_dir=report_dir)
    if not elevated:
        fallback_note = (
            "NOTE: Windows did not allow the elevated diagnostics helper to run, "
            "so AutoPalExpress ran diagnostics without admin rights. Firewall "
            "inspection may be incomplete, but the rest of the report is still useful.\r\n\r\n"
        )
        _run_limited(script=script, data_dir=data_dir, report_dir=report_dir)

    after = {p.name for p in report_dir.glob(f"{_REPORT_PREFIX}*.txt")}
    new_files = after - before
    if new_files:
        report_path = report_dir / sorted(new_files)[-1]
    else:
        # Name-diffing can only miss a report if one already existed with the
        # exact same second-resolution timestamp - astronomically unlikely,
        # but falling back to the newest file on disk is cheap insurance.
        candidates = sorted(report_dir.glob(f"{_REPORT_PREFIX}*.txt"), key=lambda p: p.stat().st_mtime)
        if not candidates:
            raise DiagnosticsError("Diagnostics ran, but no report file was found afterward.")
        report_path = candidates[-1]

    # Write-Report pipes through Tee-Object, which (like PowerShell 5.1's
    # Out-File/Set-Content) writes UTF-16 LE with a BOM by default - not
    # UTF-8, even though the file extension is .txt.
    text = fallback_note + report_path.read_text(encoding="utf-16")
    return {"reportPath": str(report_path), "report": text}


def _run_elevated(*, script: Path, data_dir: Path, report_dir: Path) -> bool:
    # Elevates powershell.exe itself (not this backend process) via
    # Start-Process -Verb RunAs, same pattern as firewall.add_inbound_rule -
    # -Wait blocks until the elevated script (and its own report-writing)
    # finishes; -NoPause stops the script's own "Press Enter to close" from
    # hanging this call forever.
    ps_command = (
        f'$p = Start-Process -FilePath "powershell.exe" -ArgumentList '
        f'\'-NoProfile -ExecutionPolicy Bypass -File ""{script}"" -DataDir ""{data_dir}"" '
        f'-ReportDir ""{report_dir}"" -NoPause\' -Verb RunAs -Wait -PassThru; '
        "exit $p.ExitCode"
    )
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_command],
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired:
        logger.warning("diagnostics: elevated run timed out waiting for the permission prompt")
        return False

    if result.returncode == 0:
        return True

    logger.warning(
        "diagnostics: elevated run failed, falling back to limited mode; exit=%s stderr=%s",
        result.returncode,
        result.stderr.strip(),
    )
    return False


def _run_limited(*, script: Path, data_dir: Path, report_dir: Path) -> None:
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(script),
            "-DataDir",
            str(data_dir),
            "-ReportDir",
            str(report_dir),
            "-NoPause",
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        logger.warning("diagnostics: limited run failed, exit=%s stderr=%s", result.returncode, result.stderr.strip())
        raise DiagnosticsError("Diagnostics could not run, even without admin rights. Try the Start Menu diagnostics shortcut.")
