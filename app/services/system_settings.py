import logging
import sys
from pathlib import Path
from typing import Any

from app import storage
from app.paths import install_dir
from app.services import activity_log, instance_store, process_manager
from app.services.process_manager import ProcessError

logger = logging.getLogger("palworld_admin.system_settings")

_STORE_NAME = "system_settings"
_RUN_VALUE_NAME = "AutoPalExpress"
_RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"

_DEFAULTS: dict[str, Any] = {
    "bootWithWindows": False,
    "autoStartActiveServer": False,
}


def _load() -> dict[str, Any]:
    saved = storage.load(_STORE_NAME, {})
    return {**_DEFAULTS, **saved}


def _save(config: dict[str, Any]) -> None:
    storage.save(_STORE_NAME, {**_DEFAULTS, **config})


def _startup_target() -> Path:
    packaged = install_dir() / "AutoPalExpress.exe"
    if packaged.is_file():
        return packaged
    return Path(sys.executable).resolve()


def _run_command() -> str:
    target = _startup_target()
    return f'"{target}"'


def _read_run_value() -> str | None:
    if sys.platform != "win32":
        return None
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, _RUN_KEY) as key:
            value, _ = winreg.QueryValueEx(key, _RUN_VALUE_NAME)
            return str(value)
    except FileNotFoundError:
        return None
    except OSError as e:
        logger.warning("system_settings: couldn't read startup run key: %s", e)
        return None


def _write_run_value(enabled: bool) -> None:
    if sys.platform != "win32":
        raise RuntimeError("Windows startup is only available on Windows.")

    import winreg

    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, _RUN_KEY) as key:
        if enabled:
            winreg.SetValueEx(key, _RUN_VALUE_NAME, 0, winreg.REG_SZ, _run_command())
        else:
            try:
                winreg.DeleteValue(key, _RUN_VALUE_NAME)
            except FileNotFoundError:
                pass


def get_config() -> dict[str, Any]:
    config = _load()
    return {
        **config,
        "bootWithWindows": _read_run_value() is not None,
    }


def update_config(*, boot_with_windows: bool, auto_start_active_server: bool) -> dict[str, Any]:
    _write_run_value(boot_with_windows)
    config = {
        "bootWithWindows": boot_with_windows,
        "autoStartActiveServer": auto_start_active_server,
    }
    _save(config)
    return get_config()


def restore_active_server_if_enabled() -> None:
    config = _load()
    if not config.get("autoStartActiveServer"):
        return

    instance = instance_store.get_active()
    if not instance:
        logger.info("system_settings: auto-start skipped, no active server selected")
        return

    try:
        process_manager.start(instance)
    except ProcessError as e:
        logger.info("system_settings: auto-start skipped for %s (%s)", instance["name"], e.message)
        return

    activity_log.log(
        "info",
        instance["name"],
        "Server auto-started because AutoPalExpress launched with recovery enabled.",
    )
