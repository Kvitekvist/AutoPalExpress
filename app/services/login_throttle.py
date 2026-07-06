"""In-memory brute-force guard for /auth/login.

Keyed by client IP (not username): the panel is now reachable from the
public internet, and there's no reverse proxy in front of it to do this at
a different layer. Keying by IP rather than username means a stranger who
knows (or guesses) a real username can't use failed attempts to lock that
user out - they can only ever throttle themselves.
"""

import threading
import time

_MAX_ATTEMPTS = 10
_WINDOW_SECONDS = 15 * 60

_lock = threading.Lock()
_failures: dict[str, list[float]] = {}


class RateLimitedError(Exception):
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Too many failed login attempts. Try again in {retry_after_seconds}s.")


def check(key: str) -> None:
    with _lock:
        now = time.time()
        attempts = [t for t in _failures.get(key, []) if now - t < _WINDOW_SECONDS]
        _failures[key] = attempts
        if len(attempts) >= _MAX_ATTEMPTS:
            retry_after = int(_WINDOW_SECONDS - (now - attempts[0])) + 1
            raise RateLimitedError(max(retry_after, 1))


def record_failure(key: str) -> None:
    with _lock:
        _failures.setdefault(key, []).append(time.time())


def record_success(key: str) -> None:
    with _lock:
        _failures.pop(key, None)
