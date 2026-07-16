"""Covers app/services/save_import_service.py: detecting valid world-save
folders and importing one into a server's save slot.
"""

import pytest

from app.services import instance_store, process_manager, save_import_service
from app.services.save_import_service import SaveImportError


def _make_instance(tmp_path, name="Server 1"):
    server_path = tmp_path / name.replace(" ", "")
    server_path.mkdir()
    return instance_store.create_instance(name=name, server_path=str(server_path), source="manual")


def _make_world_save(root, world_name="MyWorld") -> None:
    world_dir = root / world_name
    world_dir.mkdir(parents=True)
    (world_dir / "Level.sav").write_bytes(b"fake level data")
    (world_dir / "LevelMeta.sav").write_bytes(b"fake meta")


def test_inspect_source_rejects_missing_path(tmp_path):
    with pytest.raises(SaveImportError):
        save_import_service.inspect_source(str(tmp_path / "does-not-exist"))


def test_inspect_source_accepts_the_world_folder_itself(tmp_path):
    _make_world_save(tmp_path, "MyWorld")
    candidates = save_import_service.inspect_source(str(tmp_path / "MyWorld"))
    assert len(candidates) == 1
    assert candidates[0]["name"] == "MyWorld"


def test_inspect_source_finds_world_folders_one_level_down(tmp_path):
    _make_world_save(tmp_path, "WorldA")
    _make_world_save(tmp_path, "WorldB")
    (tmp_path / "NotAWorld").mkdir()  # no Level.sav - should be ignored

    candidates = save_import_service.inspect_source(str(tmp_path))
    names = sorted(c["name"] for c in candidates)
    assert names == ["WorldA", "WorldB"]


def test_inspect_source_rejects_folder_with_no_world_saves(tmp_path):
    (tmp_path / "empty").mkdir()
    with pytest.raises(SaveImportError):
        save_import_service.inspect_source(str(tmp_path / "empty"))


async def test_import_save_rejects_invalid_source(tmp_path):
    instance = _make_instance(tmp_path)
    (tmp_path / "not-a-save").mkdir()
    with pytest.raises(SaveImportError):
        await save_import_service.import_save(instance, str(tmp_path / "not-a-save"))


async def test_import_save_refuses_while_server_is_running(tmp_path, monkeypatch):
    instance = _make_instance(tmp_path)
    _make_world_save(tmp_path, "MyWorld")
    monkeypatch.setattr(process_manager, "get_status", lambda instance_id: {"state": "online"})

    with pytest.raises(SaveImportError, match="Stop this server"):
        await save_import_service.import_save(instance, str(tmp_path / "MyWorld"))


async def test_import_save_replaces_slot_and_backs_up_existing_save(tmp_path):
    instance = _make_instance(tmp_path)
    _make_world_save(tmp_path, "NewWorld")

    # An existing save already sits in slot 0 - import should back it up
    # before overwriting it.
    dest_slot = save_import_service._dest_slot_dir(instance)
    old_world = dest_slot / "OldWorld"
    old_world.mkdir(parents=True)
    (old_world / "Level.sav").write_bytes(b"old data")

    result = await save_import_service.import_save(instance, str(tmp_path / "NewWorld"))

    assert result["worldName"] == "NewWorld"
    assert result["backupCreated"] is True
    assert (dest_slot / "NewWorld" / "Level.sav").is_file()
    assert not (dest_slot / "OldWorld").exists()


async def test_import_save_without_existing_slot_skips_backup(tmp_path):
    instance = _make_instance(tmp_path)
    _make_world_save(tmp_path, "NewWorld")

    result = await save_import_service.import_save(instance, str(tmp_path / "NewWorld"))

    assert result["backupCreated"] is False
