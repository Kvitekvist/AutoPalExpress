"""Covers app/services/instance_store.py: create/switch/remove, active-id
reassignment, path-based dedupe, and query-port collision handling.
"""

import pytest

from app.services import instance_store


def test_create_instance_registers_and_activates_it(tmp_path):
    server_path = tmp_path / "Server1"
    server_path.mkdir()

    instance = instance_store.create_instance(name="Server 1", server_path=str(server_path), source="manual")

    assert instance_store.get_active_id() == instance["id"]
    assert instance_store.get(instance["id"])["name"] == "Server 1"
    assert instance["gamePort"] == 8211
    assert instance["queryPort"] != instance["gamePort"]


def test_creating_instance_at_same_path_reuses_existing_record(tmp_path):
    server_path = tmp_path / "Server1"
    server_path.mkdir()

    first = instance_store.create_instance(name="Server 1", server_path=str(server_path), source="manual")
    second = instance_store.create_instance(name="Server 1 Renamed", server_path=str(server_path), source="manual")

    assert second["id"] == first["id"]
    assert len(instance_store.list_instances()) == 1


def test_switching_active_instance(tmp_path):
    a = instance_store.create_instance(name="A", server_path=str(tmp_path / "A"), source="manual", game_port=8211)
    b = instance_store.create_instance(name="B", server_path=str(tmp_path / "B"), source="manual", game_port=8221)
    # create_instance() makes the newest one active - switch back to A.
    assert instance_store.get_active_id() == b["id"]

    instance_store.set_active_instance(a["id"])
    assert instance_store.get_active_id() == a["id"]
    assert instance_store.get_active()["name"] == "A"


def test_removing_active_instance_reassigns_active_id(tmp_path):
    a = instance_store.create_instance(name="A", server_path=str(tmp_path / "A"), source="manual", game_port=8211)
    b = instance_store.create_instance(name="B", server_path=str(tmp_path / "B"), source="manual", game_port=8221)
    instance_store.set_active_instance(b["id"])

    instance_store.remove_instance(b["id"])

    assert instance_store.get(b["id"]) is None
    assert instance_store.get_active_id() == a["id"]


def test_removing_last_instance_clears_active_id(tmp_path):
    a = instance_store.create_instance(name="A", server_path=str(tmp_path / "A"), source="manual")
    instance_store.remove_instance(a["id"])
    assert instance_store.get_active_id() is None
    assert instance_store.list_instances() == []


def test_remove_instance_does_not_touch_server_files_by_default(tmp_path):
    server_path = tmp_path / "Server1"
    server_path.mkdir()
    (server_path / "marker.txt").write_text("still here")

    instance = instance_store.create_instance(name="Server 1", server_path=str(server_path), source="manual")
    instance_store.remove_instance(instance["id"])

    assert server_path.is_dir()
    assert (server_path / "marker.txt").is_file()


def test_remove_instance_can_delete_server_files(tmp_path):
    server_path = tmp_path / "Server1"
    server_path.mkdir()

    instance = instance_store.create_instance(name="Server 1", server_path=str(server_path), source="manual")
    instance_store.remove_instance(instance["id"], delete_server_files=True)

    assert not server_path.exists()


def test_query_port_defaults_away_from_game_port(tmp_path):
    instance = instance_store.create_instance(
        name="Server 1", server_path=str(tmp_path / "S"), source="manual", game_port=8211
    )
    assert instance["queryPort"] != 8211


def test_update_query_port_rejects_collision_with_game_port(tmp_path):
    instance = instance_store.create_instance(
        name="Server 1", server_path=str(tmp_path / "S"), source="manual", game_port=8211
    )
    with pytest.raises(ValueError):
        instance_store.update_query_port(instance["id"], 8211)


def test_update_query_port_rejects_collision_with_another_instance(tmp_path):
    a = instance_store.create_instance(name="A", server_path=str(tmp_path / "A"), source="manual", game_port=8211)
    b = instance_store.create_instance(name="B", server_path=str(tmp_path / "B"), source="manual", game_port=8221)

    with pytest.raises(ValueError):
        instance_store.update_query_port(b["id"], a["queryPort"])


def test_update_query_port_accepts_a_free_port(tmp_path):
    instance = instance_store.create_instance(
        name="Server 1", server_path=str(tmp_path / "S"), source="manual", game_port=8211
    )
    instance_store.update_query_port(instance["id"], 9999)
    assert instance_store.get(instance["id"])["queryPort"] == 9999
