"""In-memory session tokens. Deliberately not persisted to disk: a backend
restart logging everyone out is an acceptable, simple tradeoff, and it means
there's no session-token file lying around on disk to worry about securing.
"""

import secrets
import time
from typing import Any

_sessions: dict[str, dict[str, Any]] = {}


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    _sessions[token] = {"userId": user_id, "createdAt": time.time()}
    return token


def get_user_id(token: str) -> str | None:
    session = _sessions.get(token)
    return session["userId"] if session else None


def delete_session(token: str) -> None:
    _sessions.pop(token, None)


def delete_all_sessions_for_user(user_id: str) -> None:
    """Used when revoking a friend's access - kicks them out immediately
    even if their browser still holds a valid-looking cookie."""
    for token in [t for t, s in _sessions.items() if s["userId"] == user_id]:
        _sessions.pop(token, None)
