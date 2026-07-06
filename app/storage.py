import json
from typing import Any

from app.paths import data_dir

DATA_DIR = data_dir()


def load(name: str, default: Any) -> Any:
    path = DATA_DIR / f"{name}.json"
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save(name: str, value: Any) -> None:
    path = DATA_DIR / f"{name}.json"
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")
