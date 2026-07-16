"""Covers app/services/process_manager.py's process-discovery logic:
matching a real OS process to a server instance by folder containment, and
the safe fast-fail path when a server's PalServer.exe doesn't exist.

Actual process start/stop (Windows-specific launch flags, CTRL_BREAK_EVENT)
is intentionally not exercised here - that needs a real Windows host with a
real PalServer.exe, same class of thing this project already leaves to
manual verification (see ticket_memory.md's many NEEDS MANUAL VERIFICATION
notes for anything that needs a live game process or interactive desktop).
"""

import psutil
import pytest

from app.services import instance_store, process_manager
from app.services.process_manager import ProcessError


class _FakeProcess:
    """Duck-types just the psutil.Process methods _process_matches_instance
    actually calls, so matching logic can be tested without a real OS
    process."""

    def __init__(self, name, exe=None, cwd=None, cmdline=None, raise_on=()):
        self._name = name
        self._exe = exe
        self._cwd = cwd
        self._cmdline = cmdline or []
        self._raise_on = set(raise_on)

    def name(self):
        if "name" in self._raise_on:
            raise psutil.NoSuchProcess(0)
        return self._name

    def exe(self):
        if "exe" in self._raise_on or self._exe is None:
            raise psutil.AccessDenied(0)
        return self._exe

    def cwd(self):
        if "cwd" in self._raise_on or self._cwd is None:
            raise psutil.AccessDenied(0)
        return self._cwd

    def cmdline(self):
        if "cmdline" in self._raise_on:
            raise psutil.AccessDenied(0)
        return self._cmdline


def test_path_is_inside_true_for_real_subpath(tmp_path):
    root = process_manager._path_key(tmp_path)
    child = str(tmp_path / "sub" / "PalServer.exe")
    assert process_manager._path_is_inside(child, root) is True


def test_path_is_inside_false_for_sibling_path(tmp_path):
    root = process_manager._path_key(tmp_path / "ServerA")
    sibling = str(tmp_path / "ServerB" / "PalServer.exe")
    assert process_manager._path_is_inside(sibling, root) is False


def test_process_matches_instance_ignores_unrelated_process_names(tmp_path):
    root = process_manager._path_key(tmp_path)
    proc = _FakeProcess(name="notepad.exe", exe=str(tmp_path / "notepad.exe"))
    assert process_manager._process_matches_instance(proc, root) is False


def test_process_matches_instance_true_via_exe_path(tmp_path):
    root = process_manager._path_key(tmp_path)
    proc = _FakeProcess(name="PalServer.exe", exe=str(tmp_path / "PalServer.exe"))
    assert process_manager._process_matches_instance(proc, root) is True


def test_process_matches_instance_true_via_cwd_when_exe_denied(tmp_path):
    root = process_manager._path_key(tmp_path)
    proc = _FakeProcess(name="PalServer.exe", cwd=str(tmp_path), raise_on=("exe",))
    assert process_manager._process_matches_instance(proc, root) is True


def test_process_matches_instance_true_via_cmdline_fallback(tmp_path):
    root = process_manager._path_key(tmp_path)
    proc = _FakeProcess(
        name="palserver-win64-shipping-cmd.exe",
        cmdline=[str(tmp_path / "PalServer-Win64-Shipping-Cmd.exe"), "-port=8211"],
        raise_on=("exe", "cwd"),
    )
    assert process_manager._process_matches_instance(proc, root) is True


def test_process_matches_instance_false_when_paths_are_unrelated(tmp_path):
    root = process_manager._path_key(tmp_path / "RealServer")
    proc = _FakeProcess(name="PalServer.exe", exe=str(tmp_path / "SomewhereElse" / "PalServer.exe"))
    assert process_manager._process_matches_instance(proc, root) is False


def test_get_status_offline_for_untracked_instance(tmp_path):
    server_path = tmp_path / "Server1"
    server_path.mkdir()
    instance = instance_store.create_instance(name="Server 1", server_path=str(server_path), source="manual")

    status = process_manager.get_status(instance["id"])

    assert status["state"] == "offline"
    assert status["uptimeSeconds"] == 0


def test_start_fails_fast_when_exe_is_missing(tmp_path):
    server_path = tmp_path / "Server1"
    server_path.mkdir()  # no PalServer.exe inside
    instance = instance_store.create_instance(name="Server 1", server_path=str(server_path), source="manual")

    with pytest.raises(ProcessError, match="PalServer.exe"):
        process_manager.start(instance)


def test_record_and_get_last_saved_round_trip():
    assert process_manager.get_last_saved("some-instance") is None
    timestamp = process_manager.record_save("some-instance")
    assert process_manager.get_last_saved("some-instance") == timestamp
