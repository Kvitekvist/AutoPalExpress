"""Covers app/services/save_import_service.py: detecting valid world-save
folders (including deep/common Steam-Palworld folder layouts), validating
required save files, previewing the destination slot, and safely importing
one into a server's save slot with automatic rollback on failure.
"""

import pytest

from app.services import instance_store, process_manager, safe_replace, save_import_service
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


# --- Deep / common-layout discovery (TICKET-0148) -------------------------


def test_inspect_source_finds_world_two_levels_down_saveGames_layout(tmp_path):
    # SaveGames/<slot-or-steamid>/<world>/ - what you get pointing at a copied SaveGames folder.
    save_games = tmp_path / "SaveGames"
    _make_world_save(save_games / "76561198000000000", "MyWorld")

    candidates = save_import_service.inspect_source(str(save_games))
    assert [c["name"] for c in candidates] == ["MyWorld"]


def test_inspect_source_finds_world_three_levels_down_saved_layout(tmp_path):
    # Saved/SaveGames/0/<world>/ - what you get pointing at a copied Saved folder.
    saved = tmp_path / "Saved"
    _make_world_save(saved / "SaveGames" / "0", "MyWorld")

    candidates = save_import_service.inspect_source(str(saved))
    assert [c["name"] for c in candidates] == ["MyWorld"]


def test_inspect_source_finds_world_four_levels_down_full_pal_layout(tmp_path):
    # Pal/Saved/SaveGames/<steamid>/<world>/ - the full relative path from a Palworld install/AppData root.
    pal = tmp_path / "Pal"
    _make_world_save(pal / "Saved" / "SaveGames" / "76561198000000000", "MyWorld")

    candidates = save_import_service.inspect_source(str(pal))
    assert [c["name"] for c in candidates] == ["MyWorld"]


def test_inspect_source_beyond_max_depth_is_not_found(tmp_path):
    _make_world_save(tmp_path / "a" / "b" / "c" / "d" / "e", "TooDeep")
    with pytest.raises(SaveImportError):
        save_import_service.inspect_source(str(tmp_path))


def test_inspect_source_bails_out_over_the_scan_cap(tmp_path, monkeypatch):
    monkeypatch.setattr(save_import_service, "_MAX_DIRS_SCANNED", 5)
    for i in range(10):
        (tmp_path / f"folder{i}").mkdir()

    with pytest.raises(SaveImportError, match="too many subfolders"):
        save_import_service.inspect_source(str(tmp_path))


# --- Validation (TICKET-0148) ----------------------------------------------


def test_inspect_source_flags_candidate_missing_level_meta(tmp_path):
    world_dir = tmp_path / "Incomplete"
    world_dir.mkdir()
    (world_dir / "Level.sav").write_bytes(b"data")  # no LevelMeta.sav

    candidates = save_import_service.inspect_source(str(world_dir))
    assert candidates[0]["valid"] is False
    assert "missing LevelMeta.sav" in candidates[0]["issues"]


def test_inspect_source_flags_candidate_with_empty_level_sav(tmp_path):
    world_dir = tmp_path / "Empty"
    world_dir.mkdir()
    (world_dir / "Level.sav").write_bytes(b"")
    (world_dir / "LevelMeta.sav").write_bytes(b"meta")

    candidates = save_import_service.inspect_source(str(world_dir))
    assert candidates[0]["valid"] is False
    assert "Level.sav is empty" in candidates[0]["issues"]


async def test_import_save_rejects_source_missing_level_meta(tmp_path):
    instance = _make_instance(tmp_path)
    world_dir = tmp_path / "Incomplete"
    world_dir.mkdir()
    (world_dir / "Level.sav").write_bytes(b"data")

    with pytest.raises(SaveImportError, match="LevelMeta"):
        await save_import_service.import_save(instance, str(world_dir))


# --- Destination preview (TICKET-0148) -------------------------------------


def test_inspect_destination_none_when_slot_empty(tmp_path):
    instance = _make_instance(tmp_path)
    assert save_import_service.inspect_destination(instance) is None


def test_inspect_destination_returns_current_world(tmp_path):
    instance = _make_instance(tmp_path)
    dest_slot = save_import_service._dest_slot_dir(instance)
    _make_world_save(dest_slot, "CurrentWorld")

    current = save_import_service.inspect_destination(instance)
    assert current is not None
    assert current["name"] == "CurrentWorld"


# --- Automatic rollback on copy failure (TICKET-0148) ----------------------


async def test_import_save_rolls_back_to_previous_world_on_failure(tmp_path, monkeypatch):
    instance = _make_instance(tmp_path)
    _make_world_save(tmp_path, "NewWorld")
    dest_slot = save_import_service._dest_slot_dir(instance)
    _make_world_save(dest_slot, "OldWorld")

    real_replace = safe_replace.safe_replace_dir
    calls = []

    def flaky_replace(source, dest):
        calls.append(1)
        if len(calls) == 1:
            raise safe_replace.SafeReplaceError("simulated disk failure")
        return real_replace(source, dest)

    monkeypatch.setattr(safe_replace, "safe_replace_dir", flaky_replace)

    with pytest.raises(SaveImportError, match="rolled back automatically"):
        await save_import_service.import_save(instance, str(tmp_path / "NewWorld"))

    # The live slot must still have the original world, not be left empty
    # or half-imported.
    assert (dest_slot / "OldWorld" / "Level.sav").is_file()
    assert not (dest_slot / "NewWorld").exists()


async def test_import_save_reports_manual_recovery_when_rollback_also_fails(tmp_path, monkeypatch):
    instance = _make_instance(tmp_path)
    _make_world_save(tmp_path, "NewWorld")
    dest_slot = save_import_service._dest_slot_dir(instance)
    _make_world_save(dest_slot, "OldWorld")

    def always_fails(source, dest):
        raise safe_replace.SafeReplaceError("simulated disk failure")

    monkeypatch.setattr(safe_replace, "safe_replace_dir", always_fails)

    with pytest.raises(SaveImportError, match="recoverable from the backup"):
        await save_import_service.import_save(instance, str(tmp_path / "NewWorld"))
