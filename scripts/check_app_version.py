"""Fail when packaging and runtime application versions drift apart."""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.version import APP_VERSION  # noqa: E402

installer = (ROOT / "installer.iss").read_text(encoding="utf-8")
match = re.search(r'^#define MyAppVersion "([^"]+)"', installer, re.MULTILINE)
if not match:
    raise SystemExit("installer.iss does not declare MyAppVersion")
if match.group(1) != APP_VERSION:
    raise SystemExit(f"Version mismatch: runtime={APP_VERSION}, installer={match.group(1)}")
print(f"Version sources agree: {APP_VERSION}")
