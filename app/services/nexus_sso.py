"""Nexus Mods SSO (Single Sign-On) - the required connection method for a
registered/approved application, replacing the old flow of asking the super
admin to paste their personal API key into a text field.

Protocol (per https://github.com/Nexus-Mods/sso-integration-demo and
Nexus's own client libraries, the same mechanism Vortex/MO2 use):
1. Generate a request id (uuid4).
2. Open wss://sso.nexusmods.com and send {"id", "token": null, "protocol": 2}.
3. Send the user to nexusmods.com/sso?id=<id>&application=<slug> to log in
   and approve this application.
4. The socket eventually receives {"success": true, "data": {"api_key": ...}}.

The API key obtained this way is still a per-user Nexus API key - that part
is unavoidable, it's what every Nexus API call authenticates with - but it is
obtained through Nexus's own consent redirect instead of the user copying
their personal key out of their account settings, which is the distinction
Nexus's application registration process actually requires.
"""

import asyncio
import json
import logging
import uuid
from typing import Any

import websockets

logger = logging.getLogger("palworld_admin.nexus_sso")

SSO_WS_URL = "wss://sso.nexusmods.com"
# TODO: replace with the real slug once Nexus Mods confirms AutoPalExpress's
# application registration - until then this is a guess, so Nexus's own SSO
# page may reject it. Left clickable anyway (at the user's explicit request)
# so they can see for themselves what that looks like rather than the button
# being disabled pending confirmation.
APPLICATION_SLUG = "autopalexpress"

_SESSION_TIMEOUT_SECONDS = 300

_sessions: dict[str, dict[str, Any]] = {}


def authorize_url(request_id: str) -> str:
    return f"https://www.nexusmods.com/sso?id={request_id}&application={APPLICATION_SLUG}"


async def _run(request_id: str) -> None:
    session = _sessions[request_id]
    try:
        async with websockets.connect(SSO_WS_URL, open_timeout=15) as ws:
            await ws.send(json.dumps({"id": request_id, "token": None, "protocol": 2}))
            async with asyncio.timeout(_SESSION_TIMEOUT_SECONDS):
                async for raw in ws:
                    message = json.loads(raw)
                    if not message.get("success"):
                        session["status"] = "error"
                        session["error"] = message.get("error") or "Nexus Mods SSO reported an error."
                        return
                    data = message.get("data") or {}
                    if "api_key" in data:
                        session["status"] = "authorized"
                        session["apiKey"] = data["api_key"]
                        return
                    # Otherwise this is just the initial connection_token ack - keep waiting.
    except TimeoutError:
        session["status"] = "error"
        session["error"] = "Timed out waiting for Nexus Mods SSO approval. Try connecting again."
    except (OSError, websockets.exceptions.WebSocketException) as e:
        logger.warning("nexus_sso: session %s failed: %s", request_id, e)
        session["status"] = "error"
        session["error"] = "Couldn't reach Nexus Mods SSO. Try again in a moment."


def start() -> dict[str, Any]:
    request_id = str(uuid.uuid4())
    _sessions[request_id] = {"status": "pending", "apiKey": None, "error": None}
    asyncio.create_task(_run(request_id))
    return {"requestId": request_id, "authorizeUrl": authorize_url(request_id)}


def get_status(request_id: str) -> dict[str, Any] | None:
    return _sessions.get(request_id)


def finish(request_id: str) -> None:
    _sessions.pop(request_id, None)
