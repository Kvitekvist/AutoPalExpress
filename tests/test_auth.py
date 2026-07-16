"""Covers app/services/auth.py plus the /api/auth/* routes: first-super-admin
creation, invite issue/redeem, login success/failure, validation, and the
super-admin removal protection.
"""

import pytest

from app.services import auth
from app.services.auth import AuthError


def test_first_setup_creates_super_admin(super_admin):
    assert super_admin["user"]["role"] == "super_admin"
    assert super_admin["user"]["username"] == "hostadmin"

    me = super_admin["client"].get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["role"] == "super_admin"


def test_second_setup_attempt_is_rejected(super_admin):
    resp = super_admin["client"].post("/api/auth/setup", json={"username": "anyone", "password": "correct-horse-battery"})
    assert resp.status_code == 400


def test_status_reports_needs_setup(client):
    assert client.get("/api/auth/status").json()["needsSetup"] is True
    client.post("/api/auth/setup", json={"username": "hostadmin", "password": "correct-horse-battery"})
    assert client.get("/api/auth/status").json()["needsSetup"] is False


def test_invite_redeem_creates_regular_admin(super_admin, invited_admin):
    friend = invited_admin()
    assert friend["user"]["role"] == "admin"

    me = friend["client"].get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == "friendadmin"


def test_invite_cannot_be_reused(super_admin):
    invite = super_admin["client"].post("/api/users/invites").json()

    first = super_admin["client"].post(
        "/api/auth/register",
        json={"username": "first-user", "password": "correct-horse-battery", "inviteCode": invite["code"]},
    )
    assert first.status_code == 200

    second = super_admin["client"].post(
        "/api/auth/register",
        json={"username": "second-user", "password": "correct-horse-battery", "inviteCode": invite["code"]},
    )
    assert second.status_code == 400


def test_invalid_invite_code_is_rejected(super_admin):
    resp = super_admin["client"].post(
        "/api/auth/register",
        json={"username": "someone", "password": "correct-horse-battery", "inviteCode": "not-a-real-code"},
    )
    assert resp.status_code == 400


def test_login_success_and_failure(super_admin):
    client = super_admin["client"]
    client.post("/api/auth/logout")

    wrong = client.post("/api/auth/login", json={"username": "hostadmin", "password": "wrong-password"})
    assert wrong.status_code == 401

    right = client.post("/api/auth/login", json={"username": "hostadmin", "password": "correct-horse-battery"})
    assert right.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_login_unknown_username_fails_like_wrong_password(super_admin):
    resp = super_admin["client"].post("/api/auth/login", json={"username": "nobody-registered", "password": "whatever123"})
    assert resp.status_code == 401


@pytest.mark.parametrize(
    "username,password",
    [
        ("ab", "correct-horse-battery"),  # too short
        ("validname", "short"),  # password too short
    ],
)
def test_account_creation_validation(username, password):
    with pytest.raises(AuthError):
        auth.create_first_super_admin(username, password)


def test_super_admin_cannot_be_removed(super_admin):
    resp = super_admin["client"].delete(f"/api/users/{super_admin['user']['id']}")
    assert resp.status_code == 400


def test_regular_admin_can_be_removed_by_super_admin(super_admin, invited_admin):
    friend = invited_admin()

    resp = super_admin["client"].delete(f"/api/users/{friend['user']['id']}")
    assert resp.status_code == 200
    usernames = [u["username"] for u in resp.json()]
    assert "friendadmin" not in usernames

    # Removal should also kill their existing session immediately.
    assert friend["client"].get("/api/auth/me").status_code == 401
