"""Source RCON protocol client for talking to a live Palworld dedicated
server (Palworld implements the same TCP protocol Valve's Source engine
games use for remote console access).

Packet format (little-endian): int32 size | int32 requestId | int32 type |
body (null-terminated ASCII) | one extra null byte. `size` covers everything
after itself (id + type + body + null + extra null = 10 + len(body)).

Packet types: SERVERDATA_AUTH=3 (client->server login), SERVERDATA_EXECCOMMAND=2
(client->server, run a command), SERVERDATA_AUTH_RESPONSE=2 (server->client,
same numeric type as EXECCOMMAND but distinguished by being the reply to an
auth packet), SERVERDATA_RESPONSE_VALUE=0 (server->client, command output).

Each call here opens a fresh connection, authenticates, sends one command,
and closes - simpler than keeping a persistent connection alive, and it
naturally survives the game server itself restarting between calls.
"""

import asyncio
import logging
import struct
from pathlib import Path
from typing import Any

from app.services import palworld_settings

logger = logging.getLogger("palworld_admin.rcon")

_TYPE_AUTH = 3
_TYPE_EXEC_OR_AUTH_RESPONSE = 2
_TYPE_RESPONSE_VALUE = 0


class RconError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class RconNotConfiguredError(RconError):
    """RCON isn't enabled, or has no admin password set, for this server."""


class RconAuthError(RconError):
    """RCON is enabled, but the configured password was rejected."""


class RconConnectionError(RconError):
    """Could not reach the RCON port at all - server likely offline."""


def get_credentials(instance: dict[str, Any]) -> tuple[str, int, str] | None:
    config = palworld_settings.read_rcon_config(Path(instance["serverPath"]))
    if not config or not config["enabled"] or not config["port"] or not config["password"]:
        return None
    return "127.0.0.1", config["port"], config["password"]


def _encode_packet(request_id: int, packet_type: int, body: str) -> bytes:
    payload = struct.pack("<ii", request_id, packet_type) + body.encode("utf-8") + b"\x00\x00"
    return struct.pack("<i", len(payload)) + payload


async def _read_packet(reader: asyncio.StreamReader) -> tuple[int, int, str]:
    size_bytes = await reader.readexactly(4)
    (size,) = struct.unpack("<i", size_bytes)
    payload = await reader.readexactly(size)
    request_id, packet_type = struct.unpack("<ii", payload[:8])
    body = payload[8:-2].decode("utf-8", errors="replace")
    return request_id, packet_type, body


async def execute(host: str, port: int, password: str, command: str, *, timeout: float = 5.0) -> str:
    try:
        return await asyncio.wait_for(_execute(host, port, password, command), timeout=timeout)
    except asyncio.TimeoutError:
        raise RconConnectionError(f"Timed out connecting to RCON at {host}:{port}.")
    except (ConnectionRefusedError, OSError) as e:
        raise RconConnectionError(f"Could not reach the server's RCON port ({host}:{port}): {e}")


async def _execute(host: str, port: int, password: str, command: str) -> str:
    reader, writer = await asyncio.open_connection(host, port)
    try:
        writer.write(_encode_packet(1, _TYPE_AUTH, password))
        await writer.drain()

        # Real Source RCON servers send an empty SERVERDATA_RESPONSE_VALUE
        # packet immediately before the actual auth response - read packets
        # until we see one with type matching the auth response, rather than
        # assuming the first packet back is it.
        auth_ok = False
        for _ in range(4):
            request_id, packet_type, _body = await _read_packet(reader)
            if packet_type == _TYPE_EXEC_OR_AUTH_RESPONSE:
                auth_ok = request_id != -1
                break
        else:
            raise RconAuthError("RCON server never sent an auth response.")

        if not auth_ok:
            raise RconAuthError("RCON authentication failed - check the Admin Password in World Settings.")

        writer.write(_encode_packet(2, _TYPE_EXEC_OR_AUTH_RESPONSE, command))
        await writer.drain()
        _request_id, _packet_type, body = await _read_packet(reader)
        return body
    finally:
        writer.close()
        try:
            await writer.wait_closed()
        except OSError:
            pass


async def _run(instance: dict[str, Any], command: str) -> str:
    creds = get_credentials(instance)
    if not creds:
        raise RconNotConfiguredError(
            "RCON isn't enabled for this server. Turn on RCON Enabled and set an Admin Password in World Settings first."
        )
    host, port, password = creds
    return await execute(host, port, password, command)


async def broadcast(instance: dict[str, Any], message: str) -> None:
    await _run(instance, f"Broadcast {message}")


async def save(instance: dict[str, Any]) -> None:
    await _run(instance, "Save")


async def show_players(instance: dict[str, Any]) -> list[dict[str, str]]:
    """Returns [{"name", "playeruid", "steamid"}, ...] currently connected.
    Palworld's ShowPlayers response is a CSV-style table: a header row
    ("name,playeruid,steamid") followed by one row per connected player, or
    just the header alone when nobody's online."""
    body = await _run(instance, "ShowPlayers")
    lines = [line for line in body.strip().splitlines() if line.strip()]
    if len(lines) <= 1:
        return []
    players = []
    for line in lines[1:]:
        parts = line.split(",")
        if len(parts) >= 3:
            players.append({"name": parts[0].strip(), "playeruid": parts[1].strip(), "steamid": parts[2].strip()})
    return players


def _kick_ban_id(steamid: str) -> str:
    """Palworld's own server console logs a connecting Steam player as
    "User id: steam_<SteamID64>", but ShowPlayers' steamid column returns
    just the bare numeric ID with no prefix - KickPlayer/BanPlayer/UnBanPlayer
    need the "steam_"-prefixed form (matching what the game itself logs), or
    they silently don't match any connected player. Left as-is for anything
    that isn't a bare numeric ID (e.g. a playeruid fallback for a non-Steam
    connection), since there's no evidence that needs a prefix at all."""
    return f"steam_{steamid}" if steamid.isdigit() else steamid


def _check_result(action: str, steamid: str, response: str) -> None:
    # Palworld replies with a plain-text status line rather than an error
    # code - e.g. "Failed to Kick: <id>" - so a completed RCON round-trip
    # isn't proof the action actually happened; the response has to be
    # inspected or a failed kick/ban/unban silently reports as a success.
    # Logged unconditionally (not just on failure) since a "success" reply
    # for an ID Palworld didn't actually recognize looks identical to a real
    # success from here - the raw text is the only way to tell them apart
    # after the fact.
    logger.info("rcon: %s %s -> %r", action, steamid, response)
    if "failed" in response.lower():
        raise RconError(response.strip() or f"Failed to {action} {steamid}.")


async def kick_player(instance: dict[str, Any], steamid: str) -> None:
    response = await _run(instance, f"KickPlayer {_kick_ban_id(steamid)}")
    _check_result("kick", steamid, response)


async def ban_player(instance: dict[str, Any], steamid: str) -> None:
    response = await _run(instance, f"BanPlayer {_kick_ban_id(steamid)}")
    _check_result("ban", steamid, response)


async def unban_player(instance: dict[str, Any], steamid: str) -> None:
    response = await _run(instance, f"UnBanPlayer {_kick_ban_id(steamid)}")
    _check_result("unban", steamid, response)
