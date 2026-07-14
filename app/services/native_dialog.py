"""Opens a native Windows folder picker. The admin backend and its web UI
always run on the same machine, so a server-side dialog is a legitimate
stand-in for a browser folder picker (browsers can't expose real filesystem
paths to a page).

Shown via a short-lived PowerShell subprocess (System.Windows.Forms's
FolderBrowserDialog), not tkinter in-process (TICKET-0131): every caller
invokes this through asyncio.to_thread, so it never runs on the process's
main thread - uvicorn's event loop already owns that. tkinter's Tcl/Tk
runtime isn't safe to initialize outside the main thread, and doing so was
observed to bring down the entire packaged process with a low-level native
crash rather than a normal Python exception. A subprocess has its own real
main thread, sidestepping the problem entirely, and matches this project's
existing pattern of shelling out to PowerShell for other native Windows
integration (firewall.py, diagnostics.py).
"""

import logging
import subprocess

logger = logging.getLogger("palworld_admin.native_dialog")


def _ps_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def pick_folder(title: str, initial_dir: str | None = None) -> str | None:
    script = (
        "Add-Type -AssemblyName System.Windows.Forms;"
        "$d = New-Object System.Windows.Forms.FolderBrowserDialog;"
        f"$d.Description = {_ps_quote(title)};"
    )
    if initial_dir:
        script += f"$d.SelectedPath = {_ps_quote(initial_dir)};"
    script += (
        "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {"
        "Write-Output $d.SelectedPath"
        "}"
    )

    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-STA", "-Command", script],
            capture_output=True,
            text=True,
            timeout=300,
        )
    except (OSError, subprocess.TimeoutExpired):
        logger.warning("pick_folder: PowerShell folder picker didn't run")
        return None

    if result.returncode != 0:
        logger.warning("pick_folder: PowerShell folder picker failed: %s", result.stderr.strip())
        return None

    path = result.stdout.strip()
    return path or None
