"""Adds Windows Firewall inbound rules (for the admin panel's own port, and
separately for whatever game port a server is using).

This backend runs as a normal (non-admin) process, and firewall changes
require admin rights - rather than asking the user to open an elevated
terminal themselves, this shells out to a UAC-elevated helper process. The
user still has to approve the Windows "Do you want to allow this app to
make changes" prompt themselves; this only saves them from finding and
typing the netsh command by hand.
"""

import logging
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger("palworld_admin.firewall")


class FirewallError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def rule_exists(rule_name: str) -> bool:
    result = subprocess.run(
        ["netsh", "advfirewall", "firewall", "show", "rule", f"name={rule_name}"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    return result.returncode == 0 and "No rules match" not in result.stdout


def add_inbound_rule(rule_name: str, port: int, protocol: str = "TCP") -> None:
    if rule_exists(rule_name):
        return

    # Written to a temp .bat and elevated via PowerShell's Start-Process
    # -Verb RunAs, rather than trying to nest quoting for netsh directly
    # through two layers of shell - this keeps the actual command simple
    # and lets Windows show its normal UAC consent prompt for it.
    script = (
        f'netsh advfirewall firewall add rule name="{rule_name}" dir=in action=allow '
        f"protocol={protocol} localport={port}\r\n"
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".bat", delete=False, encoding="utf-8") as f:
        f.write(script)
        bat_path = f.name

    try:
        ps_command = (
            f'$p = Start-Process -FilePath "{bat_path}" -Verb RunAs -Wait -PassThru -WindowStyle Hidden; '
            "exit $p.ExitCode"
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_command],
            capture_output=True,
            text=True,
            timeout=60,
        )
    finally:
        Path(bat_path).unlink(missing_ok=True)

    if result.returncode != 0:
        logger.warning("firewall: elevation failed, exit=%s stderr=%s", result.returncode, result.stderr)
        raise FirewallError(
            "Windows didn't add the rule - you may have declined the permission prompt. Try again and click 'Yes'."
        )

    if not rule_exists(rule_name):
        raise FirewallError("The command ran, but the rule doesn't seem to have been created. Try again.")

    logger.info("firewall: added inbound %s rule %r for port %s", protocol, rule_name, port)
