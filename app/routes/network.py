import asyncio
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import firewall, instance_store, network_verification, public_ip, upnp
from app.services.firewall import FirewallError
from app.services.upnp import UpnpError

logger = logging.getLogger("palworld_admin.network")

router = APIRouter()

ADMIN_PORT = 8000  # matches desktop_app.py / Palworld_Server.py
ADMIN_FIREWALL_RULE_NAME = "AutoPalExpress"
# Name a pre-rename (TICKET-0127) install would have created this rule under -
# checked as a fallback so an existing rule from before the rename still
# counts as "already allowed" instead of looking absent and prompting a
# redundant duplicate-rule UAC re-elevation.
_LEGACY_ADMIN_FIREWALL_RULE_NAME = "Palworld Server Admin"


def _game_firewall_rule_name(port: int, protocol: str) -> str:
    # Named per port/protocol (unlike the fixed admin-port rule) since the
    # game port varies per instance and can now be overridden manually.
    return f"Palworld Server Game Port {port} ({protocol})"


def _require_active_instance() -> dict[str, Any]:
    instance = instance_store.get_active()
    if not instance:
        raise HTTPException(status_code=400, detail="No server selected. Create or import one in Settings.")
    return instance


def _resolve_port(instance: dict[str, Any]) -> int:
    return instance_store.resolve_game_port(instance)


async def _forward(*, port: int, protocol: str, description: str) -> dict[str, Any]:
    gateway = await asyncio.to_thread(upnp.discover_gateway)
    if not gateway:
        raise HTTPException(status_code=502, detail="No UPnP-capable router found on this network.")

    local_ip = upnp.local_ip()
    try:
        await asyncio.to_thread(
            upnp.add_port_mapping,
            gateway,
            external_port=port,
            internal_port=port,
            internal_client=local_ip,
            protocol=protocol,
            description=description,
        )
        external_ip = await asyncio.to_thread(upnp.get_external_ip, gateway)
    except UpnpError as e:
        if e.code == "718":
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Port {port} is already mapped on your router in a way this tool can't take over "
                    "automatically (often a sign it was already forwarded manually before, or by another "
                    f"device). Open your router's port forwarding page, find the existing {protocol} {port} "
                    "entry, and confirm it points to this PC."
                ),
            )
        raise HTTPException(status_code=502, detail=e.message)

    if not external_ip:
        external_ip = await public_ip.fetch_public_ip()

    return {"port": port, "externalIp": external_ip, "routerName": gateway.friendly_name}


async def _unforward(*, port: int, protocol: str) -> dict[str, Any]:
    gateway = await asyncio.to_thread(upnp.discover_gateway)
    if not gateway:
        raise HTTPException(status_code=502, detail="No UPnP-capable router found on this network.")

    try:
        await asyncio.to_thread(upnp.delete_port_mapping, gateway, external_port=port, protocol=protocol)
    except UpnpError as e:
        if e.code != "714":  # NoSuchEntryInArray - already gone, nothing to do
            raise HTTPException(status_code=502, detail=e.message)

    return {"port": port}


@router.get("/upnp/status")
async def upnp_status() -> dict[str, Any]:
    gateway = await asyncio.to_thread(upnp.discover_gateway)

    external_ip = None
    if gateway:
        try:
            external_ip = await asyncio.to_thread(upnp.get_external_ip, gateway)
        except UpnpError:
            external_ip = None
    if not external_ip:
        # Works even when the router has no/broken UPnP - sharing the address
        # with friends shouldn't depend on whether auto-forwarding is possible.
        external_ip = await public_ip.fetch_public_ip()

    instance = instance_store.get_active()
    port = _resolve_port(instance) if instance else None
    query_port = (
        instance_store.resolve_query_port(instance, port)
        if instance and port and instance.get("useQueryPort")
        else None
    )

    try:
        local_ip = await asyncio.to_thread(upnp.local_ip)
    except OSError:
        # Doesn't depend on UPnP/a router at all (just an outbound socket
        # trick) - only fails if the machine has no network route at all,
        # which would mean nothing else here works either.
        local_ip = None

    return {
        "available": bool(gateway),
        "routerName": gateway.friendly_name if gateway else None,
        "externalIp": external_ip,
        "localIp": local_ip,
        "port": port,
        "queryPort": query_port,
        "adminPort": ADMIN_PORT,
        "gameMapping": await _mapping_info(gateway, port, "UDP") if gateway and port else None,
        "queryMapping": await _mapping_info(gateway, query_port, "UDP") if gateway and query_port else None,
        "adminMapping": await _mapping_info(gateway, ADMIN_PORT, "TCP") if gateway else None,
        "gameVerified": network_verification.is_game_verified(instance["id"], port) if instance else False,
        "queryVerified": network_verification.is_query_verified(instance["id"], query_port) if instance else False,
        "adminVerified": network_verification.is_admin_verified(ADMIN_PORT),
    }


async def _mapping_info(gateway: upnp.Gateway, port: int, protocol: str) -> dict[str, Any] | None:
    """Whatever the router actually has mapped for this port right now -
    regardless of which machine (this one, or another PC on the network)
    created it, since that's state on the router itself. Lets the UI offer
    "remove" for a mapping this PC didn't create in the current session,
    which local-only "did I just click forward" state could never show."""
    try:
        mapping = await asyncio.to_thread(upnp.get_port_mapping, gateway, external_port=port, protocol=protocol)
    except UpnpError:
        return None
    if not mapping:
        return None
    this_ip = upnp.local_ip()
    return {
        "internalClient": mapping["internalClient"],
        "isThisMachine": mapping["internalClient"] == this_ip,
        "description": mapping["description"],
    }


class ForwardGameRequest(BaseModel):
    port: int | None = None  # defaults to the instance's actual configured port


@router.post("/upnp/forward")
async def upnp_forward(body: ForwardGameRequest | None = None) -> dict[str, Any]:
    instance = _require_active_instance()
    port = (body.port if body and body.port else None) or _resolve_port(instance)
    return await _forward(port=port, protocol="UDP", description=f"Palworld - {instance['name']}")


@router.post("/upnp/unforward")
async def upnp_unforward(body: ForwardGameRequest | None = None) -> dict[str, Any]:
    instance = _require_active_instance()
    port = (body.port if body and body.port else None) or _resolve_port(instance)
    return await _unforward(port=port, protocol="UDP")


@router.post("/upnp/forward-admin")
async def upnp_forward_admin() -> dict[str, Any]:
    """Forwards the admin panel's own port (TCP), separate from the game
    port, so friends can reach the login screen from outside your network."""
    return await _forward(port=ADMIN_PORT, protocol="TCP", description="AutoPalExpress Panel")


@router.post("/upnp/unforward-admin")
async def upnp_unforward_admin() -> dict[str, Any]:
    return await _unforward(port=ADMIN_PORT, protocol="TCP")


class VerifyPortRequest(BaseModel):
    port: int


@router.post("/verify/game")
async def verify_game_port(body: VerifyPortRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    network_verification.set_game_verified(instance["id"], body.port)
    return {"verified": True}


@router.delete("/verify/game")
async def unverify_game_port() -> dict[str, Any]:
    instance = _require_active_instance()
    network_verification.clear_game_verified(instance["id"])
    return {"verified": False}


@router.post("/verify/query")
async def verify_query_port(body: VerifyPortRequest) -> dict[str, Any]:
    instance = _require_active_instance()
    network_verification.set_query_verified(instance["id"], body.port)
    return {"verified": True}


@router.delete("/verify/query")
async def unverify_query_port() -> dict[str, Any]:
    instance = _require_active_instance()
    network_verification.clear_query_verified(instance["id"])
    return {"verified": False}


@router.post("/verify/admin")
async def verify_admin_port() -> dict[str, Any]:
    network_verification.set_admin_verified(ADMIN_PORT)
    return {"verified": True}


@router.delete("/verify/admin")
async def unverify_admin_port() -> dict[str, Any]:
    network_verification.clear_admin_verified()
    return {"verified": False}


@router.get("/firewall/status")
async def firewall_status() -> dict[str, Any]:
    exists = await asyncio.to_thread(firewall.rule_exists, ADMIN_FIREWALL_RULE_NAME)
    if not exists:
        exists = await asyncio.to_thread(firewall.rule_exists, _LEGACY_ADMIN_FIREWALL_RULE_NAME)
    return {"ruleExists": exists}


@router.post("/firewall/allow-admin-port")
async def firewall_allow_admin_port() -> dict[str, Any]:
    """Adds the inbound firewall rule via a UAC-elevated helper - Windows
    itself will prompt the user to approve this, same as if they'd run the
    netsh command in an admin terminal themselves."""
    try:
        await asyncio.to_thread(firewall.add_inbound_rule, ADMIN_FIREWALL_RULE_NAME, ADMIN_PORT, "TCP")
    except FirewallError as e:
        raise HTTPException(status_code=500, detail=e.message)
    return {"ruleExists": True}


@router.get("/firewall/game-status")
async def firewall_game_status(port: int, protocol: str = "UDP") -> dict[str, Any]:
    rule_name = _game_firewall_rule_name(port, protocol)
    exists = await asyncio.to_thread(firewall.rule_exists, rule_name)
    return {"ruleExists": exists, "port": port, "protocol": protocol}


class AllowGamePortRequest(BaseModel):
    port: int
    protocol: str = "UDP"


@router.post("/firewall/allow-game-port")
async def firewall_allow_game_port(body: AllowGamePortRequest) -> dict[str, Any]:
    protocol = body.protocol.upper()
    if protocol not in ("TCP", "UDP"):
        raise HTTPException(status_code=400, detail="Protocol must be TCP or UDP.")
    rule_name = _game_firewall_rule_name(body.port, protocol)
    try:
        await asyncio.to_thread(firewall.add_inbound_rule, rule_name, body.port, protocol)
    except FirewallError as e:
        raise HTTPException(status_code=500, detail=e.message)
    return {"ruleExists": True, "port": body.port, "protocol": protocol}
