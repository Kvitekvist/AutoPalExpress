"""Background scheduler for automated backups, restarts, restart warnings,
and player join/leave announcements. Runs as a single asyncio task started
once at app startup (app/main.py), checking every instance once a minute -
same minimal-dependency style as app/services/deploy_jobs.py, no external
scheduler library.

All "last fired" / "currently known players" state here is in-memory only
and resets on an app restart - acceptable since the worst case is a schedule
re-evaluating cleanly on the next tick, not corrupting anything.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

from app.services import activity_log, automation_store, backup_service, instance_store, palworld_rest, process_manager
from app.services.palworld_rest import PalworldRestError
from app.services.process_manager import ProcessError

logger = logging.getLogger("palworld_admin.scheduler")

_CHECK_INTERVAL_SECONDS = 60
_CATCH_UP_WINDOW = timedelta(minutes=15)

_last_backup_fired: dict[str, str] = {}
_last_restart_fired: dict[str, str] = {}
_last_warning_fired: dict[str, str] = {}
_known_players: dict[str, dict[str, str]] = {}  # instance_id -> {playeruid: name}


def _target_time(schedule: dict[str, Any], now: datetime) -> datetime | None:
    """Today's fire time for this schedule, or None if a weekly schedule
    doesn't match today at all. Note: for a restart's warning time computed
    by subtracting warningMinutes, a large enough value can push the warning
    into the previous calendar day for an early restart hour, in which case
    the warning is simply skipped for that occurrence - a known, accepted
    limitation for the (expected to be rare) case of very long warnings
    paired with an early-morning restart hour."""
    if schedule["frequency"] == "weekly" and now.weekday() != schedule["dayOfWeek"]:
        return None
    return now.replace(hour=schedule["hour"], minute=0, second=0, microsecond=0)


def _within_catch_up_window(target: datetime, now: datetime) -> bool:
    return target <= now <= target + _CATCH_UP_WINDOW


async def _try_broadcast(instance: dict[str, Any], message: str) -> None:
    try:
        await palworld_rest.announce(instance, message)
    except PalworldRestError as e:
        logger.info("scheduler: broadcast skipped for %s (%s)", instance["name"], e.message)


async def _check_backup(instance: dict[str, Any], config: dict[str, Any]) -> None:
    schedule = config["backup"]
    if not schedule["enabled"]:
        return
    now = datetime.now()
    target = _target_time(schedule, now)
    if target is None or not _within_catch_up_window(target, now):
        return
    key = target.date().isoformat()
    if _last_backup_fired.get(instance["id"]) == key:
        return
    _last_backup_fired[instance["id"]] = key
    try:
        await backup_service.run_backup(instance, kind="scheduled")
        logger.info("scheduler: backup completed for %s", instance["name"])
        activity_log.log("info", instance["name"], "Scheduled backup completed.")
    except (OSError, FileNotFoundError) as e:
        logger.warning("scheduler: backup failed for %s: %s", instance["name"], e)
        activity_log.log("error", instance["name"], f"Scheduled backup failed: {e}")


async def _check_restart_and_warning(instance: dict[str, Any], config: dict[str, Any]) -> None:
    schedule = config["restart"]
    if not schedule["enabled"]:
        return
    if process_manager.get_status(instance["id"])["state"] != "online":
        return  # don't "restart" a server that isn't already running

    now = datetime.now()
    restart_target = _target_time(schedule, now)
    if restart_target is None:
        return
    restart_key = restart_target.isoformat()

    warning_minutes = schedule.get("warningMinutes", 0)
    if warning_minutes > 0:
        warn_target = restart_target - timedelta(minutes=warning_minutes)
        warning_key = f"{restart_key}-warn"
        if _within_catch_up_window(warn_target, now) and _last_warning_fired.get(instance["id"]) != warning_key:
            _last_warning_fired[instance["id"]] = warning_key
            await _try_broadcast(instance, f"The realm will fall silent for maintenance in {warning_minutes} minutes.")

    if _within_catch_up_window(restart_target, now) and _last_restart_fired.get(instance["id"]) != restart_key:
        _last_restart_fired[instance["id"]] = restart_key
        activity_log.log("info", instance["name"], "Scheduled restart starting.")
        await _try_broadcast(instance, "The realm is restarting now for scheduled maintenance.")
        try:
            await palworld_rest.save(instance)
        except PalworldRestError as e:
            logger.info("scheduler: pre-restart save skipped for %s (%s)", instance["name"], e.message)
        await asyncio.to_thread(process_manager.stop, instance["id"])
        try:
            await asyncio.to_thread(process_manager.start, instance)
        except ProcessError as e:
            logger.warning("scheduler: restart failed to bring %s back up: %s", instance["name"], e.message)
            activity_log.log(
                "error", instance["name"], f"Scheduled restart failed to bring the server back up: {e.message}"
            )


async def _check_player_presence(instance: dict[str, Any], config: dict[str, Any]) -> None:
    # Player activity is tracked (and logged to the Logs page) regardless of
    # this setting - joinLeaveMessages only controls whether an in-game
    # broadcast is also sent. An admin may want the log visibility without
    # the "X has entered the realm" chat spam.
    if process_manager.get_status(instance["id"])["state"] != "online":
        return
    try:
        players = await palworld_rest.players(instance)
    except PalworldRestError:
        return

    current = {
        player_id: palworld_rest.player_display_name(p) for p in players if (player_id := palworld_rest.player_key(p))
    }
    known = _known_players.get(instance["id"])
    if known is None:
        # First poll after (re)starting the scheduler: establish a baseline
        # silently, don't announce every already-connected player as a "join".
        _known_players[instance["id"]] = current
        return

    joined = current.keys() - known.keys()
    left = known.keys() - current.keys()
    _known_players[instance["id"]] = current

    announce = config.get("joinLeaveMessages")
    for uid in joined:
        activity_log.log("info", instance["name"], f"{current[uid]} joined.")
        if announce:
            await _try_broadcast(instance, f"{current[uid]} has entered the realm.")
    for uid in left:
        activity_log.log("info", instance["name"], f"{known[uid]} left.")
        if announce:
            await _try_broadcast(instance, f"{known[uid]} has left the realm.")


async def _check_instance(instance: dict[str, Any]) -> None:
    config = automation_store.load(instance["id"])
    await _check_backup(instance, config)
    await _check_restart_and_warning(instance, config)
    await _check_player_presence(instance, config)


async def _check_all_instances() -> None:
    for instance in instance_store.list_instances():
        try:
            await _check_instance(instance)
        except Exception:
            logger.exception("scheduler: check failed for instance %s", instance.get("name"))


async def run_forever() -> None:
    logger.info("scheduler: started, checking every %ds", _CHECK_INTERVAL_SECONDS)
    while True:
        try:
            await _check_all_instances()
        except Exception:
            logger.exception("scheduler: check cycle failed")
        await asyncio.sleep(_CHECK_INTERVAL_SECONDS)
