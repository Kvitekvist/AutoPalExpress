"""Central toggle for hiding IPs and folder paths from anything a super
admin exposes on-screen while Privacy Mode is on (Super Admin > Privacy
Mode) - lets them safely screen-share/stream without having to remember
every panel that might show a real IP or install path. Values are masked
at the API layer, before they ever reach the browser, the same way
app_log_reader.py already scrubs IPs from AutoPalExpress's own console log
for non-super-admins (see app/routes/logs.py) - Privacy Mode reuses that
same idea and widens when masking applies.

Only ever applied to passive, already-decided display values (an
instance's stored serverPath, a live network status field, a diagnostics
report). Interactive folder-picker flows (Deploy/Import/Save Import
dialogs) are deliberately left unmasked - the admin has to see the real
path there to confirm they picked the right folder, and masking it mid-
selection would make those dialogs unusable.
"""

import re

from app.services import system_settings

IP_MASK = "•.•.•.•"
PATH_MASK = "••• (hidden by Privacy Mode)"

_IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_WINDOWS_PATH_RE = re.compile(r"[A-Za-z]:\\(?:[^\s\\/:*?\"<>|\r\n]+\\)*[^\s\\/:*?\"<>|\r\n]*")


def is_enabled() -> bool:
    return bool(system_settings.get_config().get("privacyMode"))


def mask_ip(value: str | None) -> str | None:
    return IP_MASK if value and is_enabled() else value


def mask_path(value: str | None) -> str | None:
    return PATH_MASK if value and is_enabled() else value


def scrub_text(text: str) -> str:
    """Best-effort redaction of IPs/paths embedded in free-text output (the
    diagnostics report is the only real case today) - not a security
    boundary, just consistent with the rest of Privacy Mode's intent."""
    if not text or not is_enabled():
        return text
    text = _IPV4_RE.sub(IP_MASK, text)
    text = _WINDOWS_PATH_RE.sub(PATH_MASK, text)
    return text
