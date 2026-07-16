"""Route-level wiring tests for /api/automation/* - the service-layer logic
(backup_service, save_import_service, safe_replace) already has thorough
unit coverage; this file exists to catch request/response-shape bugs
(pydantic validation, status codes, route registration) that unit tests
calling the service functions directly wouldn't.
"""

from pathlib import Path

from app.services import instance_store, palworld_rest
from app.services.palworld_rest import PalworldRestNotConfiguredError


def _register_active_instance(tmp_path, name="Server 1"):
    server_path = tmp_path / name.replace(" ", "")
    server_path.mkdir()
    return instance_store.create_instance(name=name, server_path=str(server_path), source="manual")


async def _no_rest(instance):
    raise PalworldRestNotConfiguredError("no real Palworld REST API in tests")


def test_get_and_update_automation_round_trips_retention(super_admin, tmp_path, monkeypatch):
    monkeypatch.setattr(palworld_rest, "save", _no_rest)
    _register_active_instance(tmp_path)
    client = super_admin["client"]

    initial = client.get("/api/automation")
    assert initial.status_code == 200
    assert initial.json()["backupRetention"] == {"maxCount": 10, "maxAgeDays": None, "maxTotalBytes": None}

    body = initial.json()
    body["backupRetention"] = {"maxCount": 5, "maxAgeDays": 30, "maxTotalBytes": None}
    updated = client.post("/api/automation", json=body)
    assert updated.status_code == 200
    assert updated.json()["backupRetention"] == {"maxCount": 5, "maxAgeDays": 30, "maxTotalBytes": None}

    reloaded = client.get("/api/automation")
    assert reloaded.json()["backupRetention"]["maxCount"] == 5


def test_update_automation_rejects_invalid_retention(super_admin, tmp_path, monkeypatch):
    monkeypatch.setattr(palworld_rest, "save", _no_rest)
    _register_active_instance(tmp_path)
    client = super_admin["client"]

    body = client.get("/api/automation").json()
    body["backupRetention"] = {"maxCount": 0, "maxAgeDays": None, "maxTotalBytes": None}
    resp = client.post("/api/automation", json=body)
    assert resp.status_code == 400


def test_backup_lifecycle_through_routes(super_admin, tmp_path, monkeypatch):
    monkeypatch.setattr(palworld_rest, "save", _no_rest)
    instance = _register_active_instance(tmp_path)
    client = super_admin["client"]

    world = Path(instance["serverPath"]) / "Pal" / "Saved" / "SaveGames" / "0" / "MyWorld"
    world.mkdir(parents=True)
    (world / "Level.sav").write_bytes(b"data")
    (world / "LevelMeta.sav").write_bytes(b"meta")

    run_resp = client.post("/api/automation/backups/run")
    assert run_resp.status_code == 200
    timestamp = run_resp.json()["timestamp"]

    list_resp = client.get("/api/automation/backups")
    assert list_resp.status_code == 200
    assert any(b["timestamp"] == timestamp for b in list_resp.json())

    verify_resp = client.post(f"/api/automation/backups/{timestamp}/verify")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "ok"

    notes_resp = client.patch(f"/api/automation/backups/{timestamp}/notes", json={"notes": "before update"})
    assert notes_resp.status_code == 200
    assert notes_resp.json()["notes"] == "before update"

    export_resp = client.get(f"/api/automation/backups/{timestamp}/export")
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"] == "application/zip"

    restore_resp = client.post(f"/api/automation/backups/{timestamp}/restore")
    assert restore_resp.status_code == 200
    assert restore_resp.json()["restoredFrom"] == timestamp


def test_verify_unknown_backup_returns_400(super_admin, tmp_path, monkeypatch):
    monkeypatch.setattr(palworld_rest, "save", _no_rest)
    _register_active_instance(tmp_path)
    resp = super_admin["client"].post("/api/automation/backups/does-not-exist/verify")
    assert resp.status_code == 400


def test_save_import_flow_through_routes(super_admin, tmp_path):
    _register_active_instance(tmp_path)
    client = super_admin["client"]

    source = tmp_path / "IncomingWorld"
    source.mkdir()
    (source / "Level.sav").write_bytes(b"data")
    (source / "LevelMeta.sav").write_bytes(b"meta")

    dest_before = client.get("/api/automation/save-import/destination")
    assert dest_before.status_code == 200
    assert dest_before.json()["current"] is None

    inspect_resp = client.post("/api/automation/save-import/inspect", json={"path": str(source)})
    assert inspect_resp.status_code == 200
    candidates = inspect_resp.json()["candidates"]
    assert len(candidates) == 1
    assert candidates[0]["valid"] is True

    apply_resp = client.post("/api/automation/save-import/apply", json={"path": str(source)})
    assert apply_resp.status_code == 200
    assert apply_resp.json()["worldName"] == "IncomingWorld"

    dest_after = client.get("/api/automation/save-import/destination")
    assert dest_after.json()["current"]["name"] == "IncomingWorld"


def test_save_import_inspect_rejects_bad_path(super_admin, tmp_path):
    _register_active_instance(tmp_path)
    resp = super_admin["client"].post(
        "/api/automation/save-import/inspect", json={"path": str(tmp_path / "does-not-exist")}
    )
    assert resp.status_code == 400
