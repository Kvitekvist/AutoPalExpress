"""Looks up this machine's public IP address via an external echo service,
independent of whether the router supports UPnP - so "what do I share with
friends" doesn't depend on "can this tool auto-forward the port."
"""

import logging

import httpx

logger = logging.getLogger("palworld_admin.public_ip")

ECHO_SERVICES = ("https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com")


async def fetch_public_ip() -> str | None:
    async with httpx.AsyncClient(timeout=5) as client:
        for url in ECHO_SERVICES:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                ip = resp.text.strip()
                if ip:
                    return ip
            except httpx.HTTPError as e:
                logger.info("public_ip: %s failed: %s", url, e)
                continue
    return None
