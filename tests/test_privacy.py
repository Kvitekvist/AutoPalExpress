"""Covers app/services/privacy.py (the Privacy Mode masking helpers) and
its wiring into instance/mods-path API responses - the network.py/
diagnostics.py call sites aren't covered here since they depend on real
UPnP discovery/subprocess calls unsuitable for a hermetic test; those were
verified by reading the code, not exercised live.

_write_run_value() (system_settings' Windows "Run" registry key writer) is
gated to raise RuntimeError off Windows regardless of the boolean passed -
CI's backend-tests job runs on ubuntu-latest, so every test here that goes
through update_config()/the settings route monkeypatches it to a no-op,
the same way other tests monkeypatch external dependencies like
palworld_rest.save.
"""

import pytest

from app.services import privacy, system_settings


@pytest.fixture(autouse=True)
def _no_registry_writes(monkeypatch):
    monkeypatch.setattr(system_settings, "_write_run_value", lambda enabled: None)


def _register_active_instance(tmp_path, name="Server 1"):
    from app.services import instance_store

    server_path = tmp_path / name.replace(" ", "")
    server_path.mkdir()
    return instance_store.create_instance(name=name, server_path=str(server_path), source="manual")


def test_masking_helpers_are_no_ops_when_privacy_mode_is_off():
    assert privacy.is_enabled() is False
    assert privacy.mask_ip("203.0.113.5") == "203.0.113.5"
    assert privacy.mask_path(r"C:\Users\jens\Servers\Pal") == r"C:\Users\jens\Servers\Pal"
    assert privacy.scrub_text("Server is at 203.0.113.5, folder C:\\Users\\jens\\Pal") == (
        "Server is at 203.0.113.5, folder C:\\Users\\jens\\Pal"
    )


def test_masking_helpers_redact_when_privacy_mode_is_on():
    system_settings.update_config(boot_with_windows=False, auto_start_active_server=False, privacy_mode=True)

    assert privacy.is_enabled() is True
    assert privacy.mask_ip("203.0.113.5") == privacy.IP_MASK
    assert privacy.mask_path(r"C:\Users\jens\Servers\Pal") == privacy.PATH_MASK
    assert privacy.mask_ip(None) is None
    assert privacy.mask_path(None) is None

    scrubbed = privacy.scrub_text(r"Server is at 203.0.113.5, folder C:\Users\jens\Pal\Server")
    assert "203.0.113.5" not in scrubbed
    assert r"C:\Users\jens\Pal\Server" not in scrubbed
    assert privacy.IP_MASK in scrubbed
    assert privacy.PATH_MASK in scrubbed


def test_privacy_mode_round_trips_through_system_settings_route(super_admin):
    client = super_admin["client"]

    initial = client.get("/api/system-settings")
    assert initial.status_code == 200
    assert initial.json()["privacyMode"] is False

    body = initial.json()
    body["privacyMode"] = True
    updated = client.post("/api/system-settings", json=body)
    assert updated.status_code == 200
    assert updated.json()["privacyMode"] is True

    reloaded = client.get("/api/system-settings")
    assert reloaded.json()["privacyMode"] is True


def test_instance_server_path_is_masked_when_privacy_mode_is_on(super_admin, tmp_path):
    client = super_admin["client"]
    instance = _register_active_instance(tmp_path)
    real_path = instance["serverPath"]

    unmasked = client.get("/api/instances").json()
    assert unmasked["instances"][0]["serverPath"] == real_path

    settings = client.get("/api/system-settings").json()
    settings["privacyMode"] = True
    client.post("/api/system-settings", json=settings)

    masked = client.get("/api/instances").json()
    assert masked["instances"][0]["serverPath"] == privacy.PATH_MASK
    assert masked["instances"][0]["serverPath"] != real_path


def test_mods_path_is_masked_when_privacy_mode_is_on(super_admin, tmp_path):
    client = super_admin["client"]
    _register_active_instance(tmp_path)

    unmasked = client.get("/api/mods/mods-path").json()
    assert unmasked["modsPath"] not in (None, privacy.PATH_MASK)

    settings = client.get("/api/system-settings").json()
    settings["privacyMode"] = True
    client.post("/api/system-settings", json=settings)

    masked = client.get("/api/mods/mods-path").json()
    assert masked["modsPath"] == privacy.PATH_MASK
