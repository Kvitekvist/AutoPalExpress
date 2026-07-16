"""Covers app/services/safe_replace.py: the shared safe-directory-replace
primitive used by both save import and backup restore, plus manifest
building/verification.
"""

import pathlib

import pytest

from app.services import safe_replace
from app.services.safe_replace import SafeReplaceCriticalError, SafeReplaceError


def _make_dir(root, name, files: dict[str, bytes]) -> pathlib.Path:
    d = root / name
    d.mkdir(parents=True)
    for rel, data in files.items():
        (d / rel).parent.mkdir(parents=True, exist_ok=True)
        (d / rel).write_bytes(data)
    return d


def _no_leftover_artifacts(dest: pathlib.Path) -> bool:
    prefixes = (f"{dest.name}.staged-", f"{dest.name}.rollback-")
    return not any(sibling.name.startswith(prefixes) for sibling in dest.parent.iterdir() if sibling != dest)


def test_build_manifest_and_verify_manifest_round_trip(tmp_path):
    folder = _make_dir(tmp_path, "data", {"Level.sav": b"abc", "sub/Meta.sav": b"defgh"})
    manifest = safe_replace.build_manifest(folder)

    assert len(manifest) == 2
    assert safe_replace.verify_manifest(folder, manifest) == []


def test_verify_manifest_detects_missing_file(tmp_path):
    folder = _make_dir(tmp_path, "data", {"Level.sav": b"abc"})
    manifest = safe_replace.build_manifest(folder)
    (folder / "Level.sav").unlink()

    issues = safe_replace.verify_manifest(folder, manifest)
    assert len(issues) == 1
    assert "missing" in issues[0]


def test_verify_manifest_detects_size_and_content_changes(tmp_path):
    folder = _make_dir(tmp_path, "data", {"Level.sav": b"abc"})
    manifest = safe_replace.build_manifest(folder)

    (folder / "Level.sav").write_bytes(b"xyz")  # same size, different content
    issues = safe_replace.verify_manifest(folder, manifest)
    assert any("checksum" in i for i in issues)

    (folder / "Level.sav").write_bytes(b"a much longer replacement")
    issues = safe_replace.verify_manifest(folder, manifest)
    assert any("size changed" in i for i in issues)


def test_verify_copy_detects_missing_and_mismatched_files(tmp_path):
    source = _make_dir(tmp_path, "source", {"a.txt": b"12345"})
    dest = tmp_path / "dest"
    dest.mkdir()

    assert "missing" in safe_replace.verify_copy(source, dest)[0]

    (dest / "a.txt").write_bytes(b"12")
    assert "wrong size" in safe_replace.verify_copy(source, dest)[0]

    (dest / "a.txt").write_bytes(b"12345")
    assert safe_replace.verify_copy(source, dest) == []


def test_safe_replace_dir_creates_dest_when_missing(tmp_path):
    source = _make_dir(tmp_path, "source", {"Level.sav": b"world data"})
    dest = tmp_path / "live" / "slot"

    safe_replace.safe_replace_dir(source, dest)

    assert (dest / "Level.sav").read_bytes() == b"world data"
    assert _no_leftover_artifacts(dest)


def test_safe_replace_dir_replaces_existing_content(tmp_path):
    source = _make_dir(tmp_path, "source", {"Level.sav": b"new"})
    dest = _make_dir(tmp_path, "dest", {"Level.sav": b"old", "extra.txt": b"stale"})

    safe_replace.safe_replace_dir(source, dest)

    assert (dest / "Level.sav").read_bytes() == b"new"
    assert not (dest / "extra.txt").exists()
    assert _no_leftover_artifacts(dest)


def test_safe_replace_dir_leaves_dest_untouched_when_copy_fails(tmp_path, monkeypatch):
    source = _make_dir(tmp_path, "source", {"Level.sav": b"new"})
    dest = _make_dir(tmp_path, "dest", {"Level.sav": b"old"})

    def broken_copytree(*args, **kwargs):
        raise OSError("disk full (simulated)")

    monkeypatch.setattr(safe_replace.shutil, "copytree", broken_copytree)

    with pytest.raises(SafeReplaceError):
        safe_replace.safe_replace_dir(source, dest)

    assert (dest / "Level.sav").read_bytes() == b"old"
    assert _no_leftover_artifacts(dest)


def test_safe_replace_dir_leaves_dest_untouched_when_verification_fails(tmp_path, monkeypatch):
    source = _make_dir(tmp_path, "source", {"Level.sav": b"new"})
    dest = _make_dir(tmp_path, "dest", {"Level.sav": b"old"})

    monkeypatch.setattr(safe_replace, "verify_copy", lambda s, d: ["simulated corruption"])

    with pytest.raises(SafeReplaceError):
        safe_replace.safe_replace_dir(source, dest)

    assert (dest / "Level.sav").read_bytes() == b"old"
    assert _no_leftover_artifacts(dest)


def test_safe_replace_dir_self_heals_when_final_swap_fails(tmp_path, monkeypatch):
    source = _make_dir(tmp_path, "source", {"Level.sav": b"new"})
    dest = _make_dir(tmp_path, "dest", {"Level.sav": b"old"})

    original_rename = pathlib.Path.rename

    def flaky_rename(self, target):
        if self.name.startswith(f"{dest.name}.staged-"):
            raise OSError("simulated failure moving the new copy into place")
        return original_rename(self, target)

    monkeypatch.setattr(pathlib.Path, "rename", flaky_rename)

    with pytest.raises(SafeReplaceError) as exc_info:
        safe_replace.safe_replace_dir(source, dest)

    assert not isinstance(exc_info.value, SafeReplaceCriticalError)
    # The original must be restored exactly - never left missing.
    assert (dest / "Level.sav").read_bytes() == b"old"
    assert _no_leftover_artifacts(dest)


def test_safe_replace_dir_raises_critical_error_when_self_heal_also_fails(tmp_path, monkeypatch):
    source = _make_dir(tmp_path, "source", {"Level.sav": b"new"})
    dest = _make_dir(tmp_path, "dest", {"Level.sav": b"old"})

    original_rename = pathlib.Path.rename

    def always_fails(self, target):
        if self.name.startswith(f"{dest.name}.staged-") or self.name.startswith(f"{dest.name}.rollback-"):
            raise OSError("simulated failure")
        return original_rename(self, target)

    monkeypatch.setattr(pathlib.Path, "rename", always_fails)

    with pytest.raises(SafeReplaceCriticalError):
        safe_replace.safe_replace_dir(source, dest)
