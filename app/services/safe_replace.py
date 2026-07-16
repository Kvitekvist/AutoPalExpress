"""Shared primitive for safely replacing a live directory's contents with
another directory's contents - used by both save_import_service.py (replacing
the active save slot with an imported world) and backup_service.py (restoring
a backup onto the live SaveGames folder).

The core problem this exists to avoid: the previous approach everywhere in
this codebase for "replace directory X with new content" was delete-then-copy
(see mod_installer.extract_and_install). For a live game server's save data,
that leaves X missing or half-copied for the entire duration of the copy if
the process is interrupted (crash, disk full, power loss) - there is no
window in which that's an acceptable risk for the only copy of someone's
world. safe_replace_dir() instead copies to a temporary sibling first,
verifies that copy, and only then swaps it into place with two fast renames -
the live directory is either left completely untouched or is fully replaced,
never left partially written. If the swap itself fails, the original (moved
aside, not deleted) is put straight back.
"""

import hashlib
import logging
import shutil
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger("palworld_admin.safe_replace")

_HASH_CHUNK_SIZE = 1024 * 1024


class SafeReplaceError(Exception):
    """The replacement didn't happen - the destination is guaranteed
    untouched (the failure was in the copy-to-temp or verify step, before
    the destination is ever modified)."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class SafeReplaceCriticalError(SafeReplaceError):
    """The swap step itself failed, *and* putting the original back also
    failed - the destination's state is no longer guaranteed. Callers should
    treat this as a signal to fall back to any other recovery they have
    (e.g. a separately-stored backup), not just log and move on. In
    practice this should be effectively unreachable on a local filesystem -
    two renames of directories that were just proven to exist - but the
    caller is told explicitly rather than this being silently swallowed."""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(_HASH_CHUNK_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(folder: Path) -> list[dict[str, Any]]:
    """Per-file {path, sizeBytes, sha256} for every file under `folder`,
    path relative to `folder` with forward slashes (stable across
    platforms). Sorted for a deterministic, diffable manifest."""
    entries = []
    for file_path in sorted(folder.rglob("*")):
        if file_path.is_file():
            entries.append(
                {
                    "path": file_path.relative_to(folder).as_posix(),
                    "sizeBytes": file_path.stat().st_size,
                    "sha256": sha256_file(file_path),
                }
            )
    return entries


def verify_manifest(folder: Path, manifest: list[dict[str, Any]]) -> list[str]:
    """Re-checks `folder`'s real files against a previously-built manifest.
    Returns a list of human-readable issues; empty means everything in the
    manifest is present with matching size and hash."""
    issues: list[str] = []
    for entry in manifest:
        file_path = folder / entry["path"]
        if not file_path.is_file():
            issues.append(f"'{entry['path']}' is missing.")
            continue
        actual_size = file_path.stat().st_size
        if actual_size != entry["sizeBytes"]:
            issues.append(f"'{entry['path']}' size changed ({entry['sizeBytes']} -> {actual_size} bytes).")
            continue
        if sha256_file(file_path) != entry["sha256"]:
            issues.append(f"'{entry['path']}' content doesn't match its recorded checksum.")
    return issues


def verify_copy(source: Path, dest: Path) -> list[str]:
    """Cheap post-copy check (existence + size only, no hashing) - enough to
    catch a truncated/partial copy without doubling I/O on every single
    import/restore the way a full hash comparison would."""
    issues: list[str] = []
    for src_file in source.rglob("*"):
        if not src_file.is_file():
            continue
        rel = src_file.relative_to(source)
        dest_file = dest / rel
        if not dest_file.is_file():
            issues.append(f"'{rel.as_posix()}' is missing from the copy.")
            continue
        if dest_file.stat().st_size != src_file.stat().st_size:
            issues.append(f"'{rel.as_posix()}' copied with the wrong size.")
    return issues


def safe_replace_dir(source: Path, dest: Path) -> None:
    """Replaces `dest`'s contents with `source`'s contents. `dest` is only
    ever touched by two renames at the very end, after `source` has been
    fully copied to a temporary sibling and verified - so `dest` is either
    left completely unchanged (any failure before the swap) or fully
    replaced, never left partially written.

    Raises SafeReplaceError if the copy-to-temp or verification failed
    (dest is untouched). Raises SafeReplaceCriticalError in the extremely
    unlikely case that the final swap failed *and* restoring the original
    also failed.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex[:8]
    staged = dest.parent / f"{dest.name}.staged-{token}"
    rollback = dest.parent / f"{dest.name}.rollback-{token}"

    try:
        shutil.copytree(source, staged)
        issues = verify_copy(source, staged)
        if issues:
            raise SafeReplaceError("Copy verification failed: " + "; ".join(issues))
    except Exception as e:
        shutil.rmtree(staged, ignore_errors=True)
        if isinstance(e, SafeReplaceError):
            raise
        raise SafeReplaceError(f"Could not copy the replacement into place: {e}") from e

    had_existing = dest.exists()
    if had_existing:
        dest.rename(rollback)
    try:
        staged.rename(dest)
    except OSError as e:
        if had_existing:
            try:
                if dest.exists():
                    shutil.rmtree(dest, ignore_errors=True)
                rollback.rename(dest)
            except OSError as restore_error:
                raise SafeReplaceCriticalError(
                    f"Replacing '{dest}' failed ({e}), and restoring the original also failed ({restore_error}). "
                    f"The original may still be recoverable at '{rollback}'."
                ) from restore_error
        shutil.rmtree(staged, ignore_errors=True)
        raise SafeReplaceError(f"Could not finish replacing '{dest}': {e}") from e

    if had_existing:
        shutil.rmtree(rollback, ignore_errors=True)
    logger.info("safe_replace: replaced %s with %s", dest, source)
