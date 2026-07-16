"""Per-instance scheduled backup/restart/messaging config, persisted at
data/instances/<id>/automation.json via the shared instance_storage helper.
"""

from typing import Any

from app.services import instance_storage

_STORE_NAME = "automation"

DEFAULT_BACKUP_RETENTION: dict[str, Any] = {
    # Preserves the old fixed behavior (keep the most recent 10) for
    # existing installs backfilled by load() below; age/size limits are
    # opt-in (null = unlimited) since most hosts never hit them.
    "maxCount": 10,
    "maxAgeDays": None,
    "maxTotalBytes": None,
}

DEFAULT_CONFIG: dict[str, Any] = {
    "backup": {"enabled": False, "frequency": "daily", "dayOfWeek": 0, "hour": 4},
    "restart": {"enabled": False, "frequency": "daily", "dayOfWeek": 0, "hour": 4, "warningMinutes": 10},
    "joinLeaveMessages": False,
    "backupRetention": DEFAULT_BACKUP_RETENTION,
}


def load(instance_id: str) -> dict[str, Any]:
    config = instance_storage.load(instance_id, _STORE_NAME, DEFAULT_CONFIG)
    # instance_storage.load() returns the saved file's raw contents as-is
    # when it exists - a config saved before backupRetention existed won't
    # have picked up the new default key just by adding it above, so it's
    # backfilled explicitly here (same pattern instance_store.py's
    # _dedupe_data() uses for its own old-record backfills).
    if "backupRetention" not in config:
        config["backupRetention"] = dict(DEFAULT_BACKUP_RETENTION)
    return config


def save(instance_id: str, config: dict[str, Any]) -> None:
    instance_storage.save(instance_id, _STORE_NAME, config)
