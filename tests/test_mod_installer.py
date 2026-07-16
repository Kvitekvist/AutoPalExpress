"""Covers app/services/mod_installer.py: archive extraction safety
(zip-slip, oversized archives), pak-vs-ue4ss detection, game-path-prefix
stripping, and the enable/disable/remove folder lifecycle on disk.
"""

import zipfile
from pathlib import Path

import pytest

from app.services import mod_installer
from app.services.mod_installer import ModInstallError


def _make_zip(path: Path, entries: dict[str, bytes]) -> Path:
    with zipfile.ZipFile(path, "w") as z:
        for name, data in entries.items():
            z.writestr(name, data)
    return path


def test_is_supported_archive_accepts_real_zip(tmp_path):
    archive = _make_zip(tmp_path / "mod.zip", {"Mod/file.lua": b"print('hi')"})
    assert mod_installer.is_supported_archive(archive) is True


def test_is_supported_archive_rejects_non_archive(tmp_path):
    fake = tmp_path / "mod.zip"
    fake.write_bytes(b"this is not a zip file")
    assert mod_installer.is_supported_archive(fake) is False


def test_extract_rejects_zip_slip_path_traversal(tmp_path):
    archive = _make_zip(tmp_path / "evil.zip", {"../../evil.txt": b"pwned"})
    dest = tmp_path / "mods"
    dest.mkdir()

    with pytest.raises(ModInstallError, match="unsafe path"):
        mod_installer.extract_and_install(archive, dest, "Evil Mod")

    assert not (tmp_path / "evil.txt").exists()


def test_extract_rejects_oversized_archive(tmp_path, monkeypatch):
    monkeypatch.setattr(mod_installer, "MAX_UNCOMPRESSED_BYTES", 4)
    archive = _make_zip(tmp_path / "big.zip", {"Mod/file.txt": b"this is more than 4 bytes"})
    dest = tmp_path / "mods"
    dest.mkdir()

    with pytest.raises(ModInstallError, match="too large"):
        mod_installer.extract_and_install(archive, dest, "Big Mod")


def test_detect_mod_kind_pak_when_pak_file_present(tmp_path):
    archive = _make_zip(tmp_path / "pakmod.zip", {"CoolMod/CoolMod.pak": b"pak-bytes"})
    assert mod_installer.detect_mod_kind(archive) == "pak"


def test_detect_mod_kind_ue4ss_without_pak_file(tmp_path):
    archive = _make_zip(tmp_path / "luamod.zip", {"CoolMod/scripts/main.lua": b"print('hi')"})
    assert mod_installer.detect_mod_kind(archive) == "ue4ss"


def test_extract_and_install_uses_the_single_top_level_folder(tmp_path):
    archive = _make_zip(
        tmp_path / "mod.zip",
        {"MyMod/scripts/main.lua": b"1", "MyMod/README.txt": b"readme"},
    )
    dest = tmp_path / "mods"
    dest.mkdir()

    folder_name = mod_installer.extract_and_install(archive, dest, "fallback")

    assert folder_name == "MyMod"
    assert (dest / "MyMod" / "scripts" / "main.lua").is_file()
    assert (dest / "MyMod" / "enabled.txt").read_text() == "1"


def test_extract_and_install_falls_back_to_provided_name_without_single_folder(tmp_path):
    archive = _make_zip(
        tmp_path / "mod.zip",
        {"main.lua": b"1", "README.txt": b"readme"},
    )
    dest = tmp_path / "mods"
    dest.mkdir()

    folder_name = mod_installer.extract_and_install(archive, dest, "Fallback Mod")

    assert folder_name == "Fallback Mod"
    assert (dest / "Fallback Mod" / "main.lua").is_file()


@pytest.mark.parametrize(
    "prefix",
    [
        "Pal/Binaries/Win64/Mods/",
        "Pal/Binaries/Win64/ue4ss/Mods/",
    ],
)
def test_extract_and_install_strips_ue4ss_game_path_prefix(tmp_path, prefix):
    archive = _make_zip(tmp_path / "mod.zip", {f"{prefix}CoolMod/scripts/main.lua": b"1"})
    dest = tmp_path / "mods"
    dest.mkdir()

    folder_name = mod_installer.extract_and_install(archive, dest, "fallback")

    assert folder_name == "CoolMod"
    assert (dest / "CoolMod" / "scripts" / "main.lua").is_file()
    # Nothing from the stripped prefix should leak into the mods folder.
    assert not (dest / "Pal").exists()


def test_extract_and_install_strips_paks_game_path_prefix(tmp_path):
    archive = _make_zip(tmp_path / "mod.zip", {"Pal/Content/Paks/~mods/CoolPak/CoolPak.pak": b"pak-bytes"})
    dest = tmp_path / "mods"
    dest.mkdir()

    folder_name = mod_installer.extract_and_install(archive, dest, "fallback")

    assert folder_name == "CoolPak"
    assert (dest / "CoolPak" / "CoolPak.pak").is_file()


def test_enable_disable_remove_round_trip(tmp_path):
    archive = _make_zip(tmp_path / "mod.zip", {"MyMod/main.lua": b"1"})
    mods_path = tmp_path / "mods"
    mods_path.mkdir()
    folder_name = mod_installer.extract_and_install(archive, mods_path, "fallback")

    mod_installer.disable(mods_path, folder_name)
    assert not (mods_path / folder_name).exists()
    assert (mod_installer.STAGING_DIR / folder_name).exists()

    mod_installer.enable(mods_path, folder_name)
    assert (mods_path / folder_name).exists()
    assert not (mod_installer.STAGING_DIR / folder_name).exists()
    assert (mods_path / folder_name / "enabled.txt").read_text() == "1"

    mod_installer.remove(mods_path, folder_name)
    assert not (mods_path / folder_name).exists()


def test_list_untracked_entries_excludes_tracked_and_excluded_names(tmp_path):
    mods_path = tmp_path / "mods"
    mods_path.mkdir()
    (mods_path / "TrackedMod").mkdir()
    (mods_path / "UntrackedMod").mkdir()
    (mods_path / "BuiltinLoaderFile").mkdir()
    (mods_path / "enabled.txt").write_text("1")

    result = mod_installer.list_untracked_entries(
        mods_path, tracked_names={"TrackedMod"}, exclude_names={"BuiltinLoaderFile"}
    )

    assert result == ["UntrackedMod"]
