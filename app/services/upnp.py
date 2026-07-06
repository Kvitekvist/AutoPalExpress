"""Minimal UPnP IGD (Internet Gateway Device) client for automatic port
forwarding, implemented from scratch with just sockets/XML/HTTP rather than a
third-party UPnP library, since this needs to work inside a PyInstaller
onefile exe without bundling a C extension.

This only helps when the router itself supports and has UPnP enabled - some
routers ship with it off, and it can't do anything at all behind
carrier-grade NAT (common on some ISPs/mobile connections), where there's no
router-level port to forward in the first place.
"""

import logging
import re
import socket
import time
from dataclasses import dataclass
from xml.etree import ElementTree

import httpx

logger = logging.getLogger("palworld_admin.upnp")

SSDP_ADDR = "239.255.255.250"
SSDP_PORT = 1900
SEARCH_TARGETS = (
    "urn:schemas-upnp-org:device:InternetGatewayDevice:2",
    "urn:schemas-upnp-org:device:InternetGatewayDevice:1",
)
WAN_SERVICE_TYPES = (
    "urn:schemas-upnp-org:service:WANIPConnection:2",
    "urn:schemas-upnp-org:service:WANIPConnection:1",
    "urn:schemas-upnp-org:service:WANPPPConnection:1",
)


class UpnpError(Exception):
    def __init__(self, message: str, code: str | None = None):
        super().__init__(message)
        self.message = message
        self.code = code


@dataclass
class Gateway:
    control_url: str
    service_type: str
    friendly_name: str


def _ssdp_search(search_target: str, timeout: float = 2.0) -> str | None:
    message = (
        "M-SEARCH * HTTP/1.1\r\n"
        f"HOST: {SSDP_ADDR}:{SSDP_PORT}\r\n"
        'MAN: "ssdp:discover"\r\n'
        "MX: 2\r\n"
        f"ST: {search_target}\r\n\r\n"
    ).encode()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.settimeout(timeout)
    try:
        sock.sendto(message, (SSDP_ADDR, SSDP_PORT))
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                data, _ = sock.recvfrom(4096)
            except socket.timeout:
                break
            text = data.decode(errors="replace")
            match = re.search(r"^location:\s*(.+)$", text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
    finally:
        sock.close()
    return None


def _find_text(root: ElementTree.Element, tag_name: str) -> str | None:
    for el in root.iter():
        if el.tag == tag_name or el.tag.endswith("}" + tag_name):
            return el.text
    return None


def _find_wan_service(description_url: str) -> Gateway | None:
    resp = httpx.get(description_url, timeout=5)
    resp.raise_for_status()
    root = ElementTree.fromstring(resp.text)

    friendly_name = _find_text(root, "friendlyName") or "Router"

    base_match = re.match(r"(https?://[^/]+)", description_url)
    base_url = base_match.group(1) if base_match else description_url

    for service in root.iter():
        if not service.tag.endswith("}service") and service.tag != "service":
            continue
        service_type = _find_text(service, "serviceType")
        control_url = _find_text(service, "controlURL")
        if service_type in WAN_SERVICE_TYPES and control_url:
            if control_url.startswith("/"):
                control_url = base_url + control_url
            return Gateway(control_url=control_url, service_type=service_type, friendly_name=friendly_name)
    return None


def discover_gateway() -> Gateway | None:
    for target in SEARCH_TARGETS:
        location = _ssdp_search(target)
        if location:
            gateway = _find_wan_service(location)
            if gateway:
                logger.info("upnp: found gateway %r via %s", gateway.friendly_name, gateway.service_type)
                return gateway
    logger.info("upnp: no UPnP Internet Gateway Device found")
    return None


def _soap_request(gateway: Gateway, action: str, params: dict[str, str] | None = None) -> ElementTree.Element:
    params = params or {}
    args_xml = "".join(f"<{k}>{v}</{k}>" for k, v in params.items())
    body = (
        '<?xml version="1.0"?>'
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" '
        's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">'
        "<s:Body>"
        f'<u:{action} xmlns:u="{gateway.service_type}">{args_xml}</u:{action}>'
        "</s:Body></s:Envelope>"
    )
    headers = {
        "Content-Type": 'text/xml; charset="utf-8"',
        "SOAPAction": f'"{gateway.service_type}#{action}"',
    }
    resp = httpx.post(gateway.control_url, content=body, headers=headers, timeout=5)
    if resp.status_code != 200:
        code, description = _parse_soap_fault(resp.text)
        if code:
            raise UpnpError(f"Router rejected {action}: {description or 'unknown error'} (UPnP error {code})", code=code)
        raise UpnpError(f"Router rejected {action}: HTTP {resp.status_code} - {resp.text[:200]}")
    return ElementTree.fromstring(resp.text)


def _parse_soap_fault(text: str) -> tuple[str | None, str | None]:
    try:
        root = ElementTree.fromstring(text)
    except ElementTree.ParseError:
        return None, None
    return _find_text(root, "errorCode"), _find_text(root, "errorDescription")


def get_external_ip(gateway: Gateway) -> str | None:
    root = _soap_request(gateway, "GetExternalIPAddress")
    return _find_text(root, "NewExternalIPAddress")


def add_port_mapping(
    gateway: Gateway,
    *,
    external_port: int,
    internal_port: int,
    internal_client: str,
    protocol: str = "UDP",
    description: str = "Palworld Server",
) -> None:
    params = {
        "NewRemoteHost": "",
        "NewExternalPort": str(external_port),
        "NewProtocol": protocol,
        "NewInternalPort": str(internal_port),
        "NewInternalClient": internal_client,
        "NewEnabled": "1",
        "NewPortMappingDescription": description,
        "NewLeaseDuration": "0",
    }
    try:
        _soap_request(gateway, "AddPortMapping", params)
    except UpnpError as e:
        if e.code != "718":  # ConflictInMappingEntry
            raise
        # Something (a stale mapping from a previous session, another tool,
        # the game itself) already claims this port - replace it with ours.
        # Some routers are inconsistent about this: Add's conflict check and
        # Delete's lookup don't always agree on what "matches", so a 714
        # (NoSuchEntryInArray) here just means there was nothing to clear -
        # harmless, proceed to retry the add regardless.
        logger.info("upnp: existing mapping conflict on port %s/%s, clearing and retrying", external_port, protocol)
        try:
            delete_port_mapping(gateway, external_port=external_port, protocol=protocol)
        except UpnpError as delete_error:
            if delete_error.code != "714":  # NoSuchEntryInArray
                raise
        _soap_request(gateway, "AddPortMapping", params)


def delete_port_mapping(gateway: Gateway, *, external_port: int, protocol: str = "UDP") -> None:
    _soap_request(
        gateway,
        "DeletePortMapping",
        {
            "NewRemoteHost": "",
            "NewExternalPort": str(external_port),
            "NewProtocol": protocol,
        },
    )


def local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    finally:
        s.close()
