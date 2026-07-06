"""In-memory session tokens. Deliberately not persisted to disk: a backend
restart logging everyone out is an acceptable, simple tradeoff, and it means
there's no session-token file lying around on disk to worry about securing.
"""

import secrets
import time
from typing import Any

# Matches the session cookie's own max_age (app/routes/auth.py) - without an
# equivalent server-side check, a captured/leaked raw token stayed valid
# forever regardless of what the cookie's expiry said, since only the
# browser was ever enforcing it.
_MAX_AGE_SECONDS = 60 * 60 * 24 * 30  # 30 days

_sessions: dict[str, dict[str, Any]] = {}


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    _sessions[token] = {"userId": user_id, "createdAt": time.time()}
    return token


def get_user_id(token: str) -> str | None:
    session = _sessions.get(token)
    if not session:
        return None
    if time.time() - session["createdAt"] > _MAX_AGE_SECONDS:
        _sessions.pop(token, None)
        return None
    return session["userId"]


def delete_session(token: str) -> None:
    _sessions.pop(token, None)


def delete_all_sessions_for_user(user_id: str) -> None:
    """Used when revoking a friend's access - kicks them out immediately
    even if their browser still holds a valid-looking cookie."""
    for token in [t for t, s in _sessions.items() if s["userId"] == user_id]:
        _sessions.pop(token, None)
