"""Covers app/services/backup_service.py: running a backup against a fake
SaveGames folder, the same-second collision fallback (TICKET-0104), and
reading backups back via list_backups().
"""

from app.services import backup_service, instance_store


def _make_instance(tmp_path, name="Server 1"):
    server_path = tmp_path / name.replace(" ", "")
    server_path.mkdir()
    return instance_store.create_instance(name=name, server_path=str(server_path), source="manual")


def _make_save_games(instance) -> None:
    save_games = backup_service._save_games_dir(instance)
    (save_games / "0" / "SomeWorldGuid").mkdir(parents=True)
    (save_games / "0" / "SomeWorldGuid" / "Level.sav").write_bytes(b"fake save data")


async def test_run_backup_copies_save_games_folder(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)

    record = await backup_service.run_backup(instance)

    assert record["liveSaveForced"] is False  # no real Palworld REST API running
    assert record["sizeBytes"] > 0
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    assert (backups_dir / record["timestamp"] / "SaveGames" / "0" / "SomeWorldGuid" / "Level.sav").is_file()


async def test_run_backup_fails_without_any_save_data(tmp_path):
    instance = _make_instance(tmp_path)
    try:
        await backup_service.run_backup(instance)
        assert False, "expected FileNotFoundError"
    except FileNotFoundError:
        pass


async def test_backup_before_import_returns_none_without_save_data(tmp_path):
    instance = _make_instance(tmp_path)
    assert await backup_service.backup_before_import(instance) is None


async def test_backup_before_import_snapshots_existing_save(tmp_path):
    instance = _make_instance(tmp_path)
    _make_save_games(instance)

    record = await backup_service.backup_before_import(instance)

    assert record is not None
    assert record["preImport"] is True
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


def test_prune_old_backups_keeps_only_max_backups(tmp_path):
    instance = _make_instance(tmp_path)
    backups_dir = instance_store.instance_dir(instance["id"]) / "backups"
    for i in range(backup_service.MAX_BACKUPS + 3):
        (backups_dir / f"2026-07-16_12-00-{i:02d}").mkdir(parents=True)

    backup_service._prune_old_backups(instance["id"])

    remaining = sorted(p.name for p in backups_dir.iterdir())
    assert len(remaining) == backup_service.MAX_BACKUPS
    # The newest ones (highest suffix) should be the ones kept.
    assert remaining[-1] == f"2026-07-16_12-00-{backup_service.MAX_BACKUPS + 2:02d}"
