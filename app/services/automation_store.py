"""Per-instance scheduled backup/restart/messaging config, persisted at
data/instances/<id>/automation.json via the shared instance_storage helper.
"""

from typing import Any

from app.services import instance_storage

_STORE_NAME = "automation"

DEFAULT_CONFIG: dict[str, Any] = {
    "backup": {"enabled": False, "frequency": "daily", "dayOfWeek": 0, "hour": 4},
    "restart": {"enabled": False, "frequency": "daily", "dayOfWeek": 0, "hour": 4, "warningMinutes": 10},
    "joinLeaveMessages": False,
}


def load(instance_id: str) -> dict[str, Any]:
    return instance_storage.load(instance_id, _STORE_NAME, DEFAULT_CONFIG)


def save(instance_id: str, config: dict[str, Any]) -> None:
    instance_storage.save(instance_id, _STORE_NAME, config)
