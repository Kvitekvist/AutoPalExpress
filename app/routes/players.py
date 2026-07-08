import time
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth_deps import get_current_user
from app.services import activity_log, instance_store, palworld_rest, player_history
from app.services.palworld_rest import PalworldRestError

router = APIRouter()

# Time this tool has observed the *current* connection lasting - separate
# from player_history's persisted "ever seen" record, since a session
# restarts at 0 every time a player reconnects, but the persisted roster
# should never forget someone just because they logged off.
_session_start: dict[str, dict[str, float]] = {}


def _require_active_instance() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        raise HTTPException(status_code=400, detail="No server selected. Create or import one in Settings.")
    return instance


def _track_session(instance_id: str, online_ids: set[str]) -> dict[str, float]:
    starts = _session_start.setdefault(instance_id, {})
    now = time.time()
    for sid in online_ids:
        starts.setdefault(sid, now)
    for sid in [s for s in starts if s not in online_ids]:
        del starts[sid]
    return starts


def _to_player_view(steamid: str, entry: dict[str, Any], session_starts: dict[str, float]) -> dict[str, Any]:
    online = entry.get("online", False)
    if online:
        started = session_starts.get(steamid, time.time())
        seconds = int(time.time() - started)
        timestamp = started
    else:
        seconds = 0
        timestamp = entry.get("lastSeen", time.time())
    return {
        "id": steamid,
        "characterName": entry.get("name") or "Unknown",
        "steamId": steamid,
        "level": entry.get("level") or 0,
        "guild": None,
        "pingMs": int(entry.get("ping") or 0),
        "onlineSeconds": seconds,
        "connectionStatus": "online" if online else "offline",
        "joinedAt": datetime.fromtimestamp(timestamp).isoformat(),
        "isBanned": entry.get("isBanned", False),
        "avatarSeed": steamid,
    }


async def _list_players() -> list[dict[str, Any]]:
    instance = _require_active_instance()
    try:
        raw_players = await palworld_rest.players(instance)
    except PalworldRestError as e:
        raise HTTPException(status_code=400, detail=e.message)
    online_ids = {pid for p in raw_players if (pid := p.get("userId") or p.get("playerId"))}
    session_starts = _track_session(instance["id"], online_ids)
    roster = player_history.sync_online(instance["id"], raw_players)
    return [_to_player_view(steamid, entry, session_starts) for steamid, entry in roster.items()]


@router.get("")
async def list_players() -> list[dict[str, Any]]:
    return await _list_players()


@router.post("/{player_id}/kick")
async def kick_player(player_id: str, user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    try:
        await palworld_rest.kick_player(instance, player_id)
    except PalworldRestError as e:
        raise HTTPException(status_code=400, detail=e.message)
    name = player_history.get_name(instance["id"], player_id) or player_id
    activity_log.log("warning", instance["name"], f"{name} was kicked by {user['username']}.")
    return await _list_players()


@router.post("/{player_id}/ban")
async def ban_player(player_id: str, user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    try:
        await palworld_rest.ban_player(instance, player_id)
    except PalworldRestError as e:
        raise HTTPException(status_code=400, detail=e.message)
    player_history.set_banned(instance["id"], player_id, True)
    name = player_history.get_name(instance["id"], player_id) or player_id
    activity_log.log("warning", instance["name"], f"{name} was banned by {user['username']}.")
    return await _list_players()


@router.post("/{player_id}/unban")
async def unban_player(player_id: str, user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    instance = _require_active_instance()
    try:
        await palworld_rest.unban_player(instance, player_id)
    except PalworldRestError as e:
        raise HTTPException(status_code=400, detail=e.message)
    player_history.set_banned(instance["id"], player_id, False)
    name = player_history.get_name(instance["id"], player_id) or player_id
    activity_log.log("info", instance["name"], f"{name} was unbanned by {user['username']}.")
    return await _list_players()
