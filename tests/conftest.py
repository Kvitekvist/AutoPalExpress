"""Shared pytest fixtures.

The env var override must be set before *any* `app.*` module is imported -
several services (app/storage.py, instance_store.py, mod_installer.py)
resolve `data_dir()` once into a module-level constant at import time, so
setting this later would have no effect. conftest.py is always imported by
pytest before it collects test modules in the same directory, which is what
makes this ordering safe.
"""

import os
import shutil
import tempfile
from pathlib import Path

_TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="autopalexpress-tests-"))
os.environ["AUTOPAL_DATA_DIR"] = str(_TEST_DATA_DIR)

import pytest
from fastapi.testclient import TestClient

from app.services import login_throttle, process_manager, session_store


@pytest.fixture(autouse=True)
def _isolated_data_dir():
    """Wipes the shared test data dir and every in-memory store after each
    test. The data dir is shared (not per-test) because several modules
    cache it in a module-level constant at import time (see module
    docstring) - clearing its contents is the only way to get per-test
    isolation without changing that production caching behavior."""
    yield
    for child in _TEST_DATA_DIR.iterdir():
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)
        else:
            child.unlink(missing_ok=True)
    session_store._sessions.clear()
    login_throttle._failures.clear()
    process_manager._processes.clear()
    process_manager._started_at.clear()
    process_manager._stopping.clear()
    process_manager._last_saved_at.clear()


@pytest.fixture
def data_dir() -> Path:
    return _TEST_DATA_DIR


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def super_admin(client):
    """Creates the first (and only) super admin account and leaves `client`
    logged in as them (TestClient persists cookies across requests)."""
    resp = client.post("/api/auth/setup", json={"username": "hostadmin", "password": "correct-horse-battery"})
    assert resp.status_code == 200, resp.text
    return {"client": client, "user": resp.json(), "username": "hostadmin", "password": "correct-horse-battery"}


@pytest.fixture
def invited_admin(super_admin):
    """Factory fixture - call it to register a new regular admin via a
    fresh invite from `super_admin`. Returns a separate logged-in
    TestClient for the new admin, so both sessions stay independently
    usable (e.g. to prove one role can't do what the other can)."""

    def _make(username: str = "friendadmin", password: str = "correct-horse-battery") -> dict:
        invite_resp = super_admin["client"].post("/api/users/invites")
        assert invite_resp.status_code == 200, invite_resp.text
        code = invite_resp.json()["code"]

        from app.main import app

        admin_client = TestClient(app)
        register_resp = admin_client.post(
            "/api/auth/register",
            json={"username": username, "password": password, "inviteCode": code},
        )
        assert register_resp.status_code == 200, register_resp.text
        return {"client": admin_client, "user": register_resp.json()}

    return _make
