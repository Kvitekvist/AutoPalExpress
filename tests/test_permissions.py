"""Covers role-gating: routes reserved for the super admin must reject a
regular admin, routes reserved for any logged-in user must reject an
anonymous caller, and the super admin must actually be let through (not just
"anyone but this specific admin").
"""


def test_unauthenticated_request_is_rejected(client):
    resp = client.get("/api/instances")
    assert resp.status_code == 401


def test_regular_admin_can_use_authed_only_routes(super_admin, invited_admin):
    friend = invited_admin()
    resp = friend["client"].get("/api/instances")
    assert resp.status_code == 200


def test_regular_admin_is_blocked_from_system_settings(super_admin, invited_admin):
    friend = invited_admin()
    resp = friend["client"].get("/api/system-settings")
    assert resp.status_code == 403


def test_super_admin_can_use_system_settings(super_admin):
    resp = super_admin["client"].get("/api/system-settings")
    assert resp.status_code == 200


def test_regular_admin_is_blocked_from_automation(super_admin, invited_admin):
    friend = invited_admin()
    resp = friend["client"].get("/api/automation")
    assert resp.status_code == 403


def test_super_admin_passes_automation_gate(super_admin):
    # No active server instance is registered in this test, so the route
    # itself 400s past the auth layer - that 400 (not 403) is exactly what
    # proves the super admin cleared the permission check.
    resp = super_admin["client"].get("/api/automation")
    assert resp.status_code == 400


def test_regular_admin_is_blocked_from_network_routes(super_admin, invited_admin):
    friend = invited_admin()
    resp = friend["client"].get("/api/network/firewall/status")
    assert resp.status_code == 403


def test_regular_admin_is_blocked_from_user_management(super_admin, invited_admin):
    friend = invited_admin()
    assert friend["client"].get("/api/users").status_code == 403
    assert friend["client"].post("/api/users/invites").status_code == 403


def test_regular_admin_cannot_approve_or_deny_mod_wishlist(super_admin, invited_admin):
    friend = invited_admin()
    assert friend["client"].post("/api/mods/wishlist/some-request-id/approve").status_code == 403
    assert friend["client"].post("/api/mods/wishlist/some-request-id/deny").status_code == 403


def test_super_admin_clears_mod_wishlist_gate(super_admin):
    # No active server instance is registered, so the route 400s past the
    # auth layer - proving the super admin cleared the super-admin-only
    # dependency (a regular admin gets 403 before ever reaching that check).
    resp = super_admin["client"].post("/api/mods/wishlist/some-request-id/deny")
    assert resp.status_code == 400
