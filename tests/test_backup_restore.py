"""Covers app/services/backup_service.py: running a backup against a fake
SaveGames folder, the same-second collision fallback (TICKET-0104),
manifest/integrity verification, one-click restore (including automatic
rollback on failure), notes, export, and configurable retention (TICKET-0155).
"""

import zipfile

import pytest

from app.services import automation_store, backup_service, instance_store, palworld_rest, process_manager, safe_replace
from app.services.backup_service import BackupError
from app.services.palworld_rest import PalworldRestNotConfiguredError


@pytest.fixture(autouse=True)
def _skip_real_rest_save(monkeypatch):
    """run_backup() always tries a live Palworld REST save first - with no
    real server, that means a real (slow, sometimes multi-second on this
    machine) TCP connect-refused round trip per call. None of these tests
    care about that path specifically, so fail it instantly instead."""

    async def _raise(instance):
        raise PalworldRestNotConfiguredError("no real Palworld REST API in tests")

    monkeypatch.setattr(palworld_rest, "save", _raise)


def _make_instance(tmp_path, name="Server 1"):
    server_path = tmp_path / name.replace(" ", "")
    server_path.mkdir()
    return instance_store.create_instance(name=name, server_path=str(server_path), source="manual")


def _make_save_games(instance, world_name="SomeWorldGuid", content=b"fake save data") -> None:
    save_games = backup_service._save_games_dir(instance)
    (save_games / "0" / world_name).mkdir(parents=True, exist_ok=True)
    (save_games / "0" / world_name / "Level.sav").write_bytes(content)


async def test_run_backup_copies_save_games_folder(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)

    record = await backup_service.run_backup(instance)

    assert record["liveSaveForced"] is False  # no real Palworld REST API running
    assert record["kind"] == "manual"
    assert record["sizeBytes"] > 0
    assert record["fileCount"] == 1
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    assert (backups_dir / record["timestamp"] / "SaveGames" / "0" / "SomeWorldGuid" / "Level.sav").is_file()


async def test_run_backup_records_a_verifiable_manifest(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)

    record = await backup_service.run_backup(instance)

    result = backup_service.verify_backup(instance["id"], record["timestamp"])
    assert result == {"status": "ok", "issues": []}


async def test_run_backup_honors_kind_override(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)

    record = await backup_service.run_backup(instance, kind="scheduled")
    assert record["kind"] == "scheduled"


async def test_run_backup_fails_without_any_save_data(tmp_path):
    instance = _make_instance(tmp_path)
    with pytest.raises(FileNotFoundError):
        await backup_service.run_backup(instance)


async def test_backup_before_import_returns_none_without_save_data(tmp_path):
    instance = _make_instance(tmp_path)
    assert await backup_service.backup_before_import(instance) is None


async def test_backup_before_import_snapshots_existing_save(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)

    record = await backup_service.backup_before_import(instance)

    assert record is not None
    assert record["kind"] == "pre_import"
    assert record["liveSaveForced"] is False


def test_unique_backup_dest_avoids_same_second_collision(tmp_path, monkeypatch):
    instance = _make_instance(tmp_path)
    monkeypatch.setattr(backup_service, "_backups_dir", lambda instance_id: tmp_path / "backups_root")
    (tmp_path / "backups_root").mkdir()

    first = backup_service._unique_backup_dest(instance["id"], "2026-07-16_12-00-00")
    first.mkdir(parents=True)
    second = backup_service._unique_backup_dest(instance["id"], "2026-07-16_12-00-00")

    assert first != second
    assert second.name == "2026-07-16_12-00-00-2"


def test_list_backups_reads_real_folder_path_not_stored_value(tmp_path):
    instance = _make_instance(tmp_path)
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    backup_folder = backups_dir / "2026-07-16_12-00-00"
    backup_folder.mkdir(parents=True)
    # Deliberately store a stale/wrong folder path in meta.json - list_backups
    # should overwrite it with the folder it was actually read from.
    (backup_folder / "meta.json").write_text(
        '{"timestamp": "2026-07-16_12-00-00", "sizeBytes": 5, "liveSaveForced": false, "folder": "C:/nonsense"}'
    )

    records = backup_service.list_backups(instance["id"])

    assert len(records) == 1
    assert records[0]["folder"] == str(backup_folder)
    # Legacy backup (no manifest/kind/notes recorded) should backfill cleanly.
    assert records[0]["kind"] == "manual"
    assert records[0]["notes"] == ""
    assert records[0]["hasManifest"] is False


def test_list_backups_backfills_legacy_pre_import_flag(tmp_path):
    instance = _make_instance(tmp_path)
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    backup_folder = backups_dir / "2026-07-16_12-00-00"
    backup_folder.mkdir(parents=True)
    (backup_folder / "meta.json").write_text(
        '{"timestamp": "2026-07-16_12-00-00", "sizeBytes": 5, "liveSaveForced": false, "preImport": true, "folder": "x"}'
    )

    records = backup_service.list_backups(instance["id"])
    assert records[0]["kind"] == "pre_import"
    assert "preImport" not in records[0]


def test_prune_old_backups_default_retention_keeps_ten(tmp_path):
    instance = _make_instance(tmp_path)
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    for i in range(13):
        (backups_dir / f"2026-07-16_12-00-{i:02d}").mkdir(parents=True)

    backup_service._prune_old_backups(instance["id"])

    remaining = sorted(p.name for p in backups_dir.iterdir())
    assert len(remaining) == 10
    assert remaining[-1] == "2026-07-16_12-00-12"


def test_prune_old_backups_respects_configured_max_count(tmp_path):
    instance = _make_instance(tmp_path)
    automation_store.save(
        instance["id"],
        {**automation_store.DEFAULT_CONFIG, "backupRetention": {"maxCount": 3, "maxAgeDays": None, "maxTotalBytes": None}},
    )
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    for i in range(5):
        (backups_dir / f"2026-07-16_12-00-{i:02d}").mkdir(parents=True)

    backup_service._prune_old_backups(instance["id"])

    remaining = sorted(p.name for p in backups_dir.iterdir())
    assert len(remaining) == 3
    assert remaining[-1] == "2026-07-16_12-00-04"


def test_prune_old_backups_respects_max_age(tmp_path):
    import os
    import time

    instance = _make_instance(tmp_path)
    automation_store.save(
        instance["id"],
        {**automation_store.DEFAULT_CONFIG, "backupRetention": {"maxCount": None, "maxAgeDays": 7, "maxTotalBytes": None}},
    )
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    old = backups_dir / "old-backup"
    old.mkdir(parents=True)
    old_time = time.time() - 30 * 86400
    os.utime(old, (old_time, old_time))
    recent = backups_dir / "recent-backup"
    recent.mkdir(parents=True)

    backup_service._prune_old_backups(instance["id"])

    remaining = sorted(p.name for p in backups_dir.iterdir())
    assert remaining == ["recent-backup"]


def test_prune_old_backups_respects_max_total_bytes(tmp_path):
    instance = _make_instance(tmp_path)
    automation_store.save(
        instance["id"],
        {**automation_store.DEFAULT_CONFIG, "backupRetention": {"maxCount": None, "maxAgeDays": None, "maxTotalBytes": 10}},
    )
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    for i in range(3):
        d = backups_dir / f"2026-07-16_12-00-{i:02d}"
        d.mkdir(parents=True)
        (d / "data.bin").write_bytes(b"x" * 8)  # 8 bytes each, 3 of them = 24 > 10

    backup_service._prune_old_backups(instance["id"])

    remaining = sorted(p.name for p in backups_dir.iterdir())
    assert remaining == ["2026-07-16_12-00-02"]


def test_verify_backup_unknown_status_without_manifest(tmp_path):
    instance = _make_instance(tmp_path)
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    folder = backups_dir / "legacy"
    folder.mkdir(parents=True)
    (folder / "meta.json").write_text('{"timestamp": "legacy", "sizeBytes": 0, "liveSaveForced": false, "folder": "x"}')

    result = backup_service.verify_backup(instance["id"], "legacy")
    assert result["status"] == "unknown"


async def test_verify_backup_detects_corruption(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)
    record = await backup_service.run_backup(instance)

    backup_folder = instance_store.instance_dir(instance["id"]) / "backups" / record["timestamp"]
    (backup_folder / "SaveGames" / "0" / "SomeWorldGuid" / "Level.sav").write_bytes(b"corrupted!!")

    result = backup_service.verify_backup(instance["id"], record["timestamp"])
    assert result["status"] == "corrupted"
    assert result["issues"]


def test_verify_backup_raises_for_unknown_timestamp(tmp_path):
    instance = _make_instance(tmp_path)
    with pytest.raises(BackupError):
        backup_service.verify_backup(instance["id"], "does-not-exist")


async def test_set_backup_notes_persists(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)
    record = await backup_service.run_backup(instance)

    updated = backup_service.set_backup_notes(instance["id"], record["timestamp"], "Before the big mod update")
    assert updated["notes"] == "Before the big mod update"

    reloaded = backup_service.list_backups(instance["id"])
    assert reloaded[0]["notes"] == "Before the big mod update"


async def test_export_backup_zip_contains_save_data(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)
    record = await backup_service.run_backup(instance)

    zip_path = backup_service.export_backup_zip(instance["id"], record["timestamp"])

    assert zip_path.is_file()
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
    assert any(n.endswith("Level.sav") for n in names)


async def test_restore_backup_replaces_live_save(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance, world_name="OriginalWorld")
    record = await backup_service.run_backup(instance)

    # Simulate the server having moved on to a different save since.
    live = backup_service._save_games_dir(instance)
    import shutil

    shutil.rmtree(live)
    _make_save_games(instance, world_name="NewerWorld")

    result = await backup_service.restore_backup(instance, record["timestamp"])

    assert result["restoredFrom"] == record["timestamp"]
    assert result["serverWasStopped"] is False  # nothing was running
    live_world = live / "0" / "OriginalWorld" / "Level.sav"
    assert live_world.is_file()
    assert not (live / "0" / "NewerWorld").exists()


async def test_restore_backup_stops_a_running_server_first(tmp_path, monkeypatch):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)
    record = await backup_service.run_backup(instance)

    stopped = []
    monkeypatch.setattr(process_manager, "get_status", lambda instance_id: {"state": "online"})
    monkeypatch.setattr(process_manager, "stop", lambda instance_id, timeout=30: stopped.append(instance_id))

    result = await backup_service.restore_backup(instance, record["timestamp"])

    assert result["serverWasStopped"] is True
    assert stopped == [instance["id"]]


async def test_restore_backup_refuses_a_corrupted_backup(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)
    record = await backup_service.run_backup(instance)

    backup_folder = instance_store.instance_dir(instance["id"]) / "backups" / record["timestamp"]
    (backup_folder / "SaveGames" / "0" / "SomeWorldGuid" / "Level.sav").write_bytes(b"corrupted!!")

    with pytest.raises(BackupError, match="corrupted"):
        await backup_service.restore_backup(instance, record["timestamp"])

    # Live save must be untouched - the corrupted backup was never applied.
    assert (backup_service._save_games_dir(instance) / "0" / "SomeWorldGuid" / "Level.sav").read_bytes() == b"fake save data"


async def test_restore_backup_rolls_back_automatically_on_failure(tmp_path, monkeypatch):
    instance = _make_instance(tmp_path)
    _make_save_games(instance, world_name="OriginalWorld")
    record = await backup_service.run_backup(instance)

    real_replace = safe_replace.safe_replace_dir
    calls = []

    def flaky_replace(source, dest):
        calls.append(1)
        if len(calls) == 1:
            raise safe_replace.SafeReplaceError("simulated disk failure")
        return real_replace(source, dest)  # the rollback-restore attempt succeeds normally

    monkeypatch.setattr(safe_replace, "safe_replace_dir", flaky_replace)

    with pytest.raises(BackupError, match="rolled back automatically"):
        await backup_service.restore_backup(instance, record["timestamp"])

    # The pre-restore rollback snapshot should have been created, and the
    # live save restored back to its pre-restore-attempt state.
    backups = backup_service.list_backups(instance["id"])
    assert any(b["kind"] == "pre_restore" for b in backups)
    assert (backup_service._save_games_dir(instance) / "0" / "OriginalWorld" / "Level.sav").is_file()


async def test_restore_backup_raises_for_missing_save_data_in_backup(tmp_path):
    instance = _make_instance(tmp_path)
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    folder = backups_dir / "empty-backup"
    folder.mkdir(parents=True)
    (folder / "meta.json").write_text(
        '{"timestamp": "empty-backup", "sizeBytes": 0, "liveSaveForced": false, "folder": "x", "manifest": []}'
    )

    with pytest.raises(BackupError, match="no save data"):
        await backup_service.restore_backup(instance, "empty-backup")
