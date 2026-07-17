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
from app.services import privacy

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
    # A sibling "diagnostics" folder next to "data" - inside the install
    # folder when frozen, next to the project's own data/ folder in dev.
    return paths.data_dir().parent / "diagnostics"


def run(force_admin: bool = False) -> dict[str, Any]:
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
        if force_admin:
            raise DiagnosticsError(
                'Windows didn\'t allow diagnostics to run with admin rights - click "Yes" on the '
                "permission prompt and try again, or use the regular Run Diagnostics button instead."
            )
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
    return {"reportPath": privacy.mask_path(str(report_path)), "report": privacy.scrub_text(text)}


def _ps_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _ps_path_arg(value: str) -> str:
    """A PowerShell -ArgumentList array element carrying a path that may
    contain spaces. Start-Process -Verb RunAs uses ShellExecuteEx under the
    hood, which - unlike Start-Process's normal (non-elevated) CreateProcess
    path - does NOT auto-quote array elements for you; it just joins them
    with spaces, silently truncating any path at its first space with no
    error at all. Embedding real double quotes in the element's own content
    (confirmed live: fails with a bare non-zero exit code without this,
    succeeds with it) works around that."""
    return _ps_quote(f'"{value}"')


def _run_elevated(*, script: Path, data_dir: Path, report_dir: Path) -> bool:
    # Elevates powershell.exe itself (not this backend process) via
    # Start-Process -Verb RunAs, same pattern as firewall.add_inbound_rule -
    # -Wait blocks until the elevated script (and its own report-writing)
    # finishes; -NoPause stops the script's own "Press Enter to close" from
    # hanging this call forever.
    inner_args = [
        _ps_quote("-NoProfile"),
        _ps_quote("-ExecutionPolicy"),
        _ps_quote("Bypass"),
        _ps_quote("-File"),
        _ps_path_arg(str(script)),
        _ps_quote("-DataDir"),
        _ps_path_arg(str(data_dir)),
        _ps_quote("-ReportDir"),
        _ps_path_arg(str(report_dir)),
        _ps_quote("-NoPause"),
    ]
    arg_list_literal = ", ".join(inner_args)
    ps_command = (
        f"$p = Start-Process -FilePath 'powershell.exe' -ArgumentList {arg_list_literal} "
        "-Verb RunAs -Wait -PassThru; exit $p.ExitCode"
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
        raise DiagnosticsError(
            "Diagnostics could not run, even without admin rights. Try the Start Menu diagnostics shortcut."
        )
