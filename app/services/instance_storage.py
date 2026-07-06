"""Per-instance JSON storage, mirroring app/storage.py but namespaced under
data/instances/<instance_id>/ so each managed server (mods, mods-path
override, UE4SS install record) keeps state independent of every other one.
"""

import json
from typing import Any

from app.services import instance_store


def load(instance_id: str, name: str, default: Any) -> Any:
    path = instance_store.instance_dir(instance_id) / f"{name}.json"
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save(instance_id: str, name: str, value: Any) -> None:
    path = instance_store.instance_dir(instance_id) / f"{name}.json"
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")
