# TICKET-0147

**Status**

Open

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-14

---

## Description

Add `.rar` archive support for mod installation (Install From File and Nexus direct-install), alongside the `.zip`/`.7z` support added in TICKET-0145.

---

## Reason

Part of the same user mod-installation feedback as TICKET-0142 through TICKET-0146: "Manual mod installation via the app only allows .zip files, but Nexus commonly uses other types like .rar." `.7z` was tractable with a pure-Python library (`py7zr`, no external dependency); `.rar` is not - it needs either:

- A bundled `unrar.exe`/`unrar.dll` (RARLAB's freeware, redistributable in third-party applications per their license, commonly used by other tools for this exact purpose), used via Python's `rarfile` library or direct subprocess calls, or
- Shelling out to a system-installed 7-Zip/WinRAR if present (not guaranteed on a fresh Windows install, so can't be the only option).

This is a bigger packaging/licensing/installer-size decision than fit in the same batch as the other mod fixes, so it's deliberately left open rather than rushed.

---

## Implementation Plan (not started - ticket only)

* [ ] Decide: bundle a redistributable `unrar.dll`/`unrar.exe` in the installer (adds installer size, needs a license-compliance check of RARLAB's current redistribution terms) vs. only support `.rar` when the user already has 7-Zip/WinRAR installed and detectable on PATH (simpler, but silently fails for users without either).
* [ ] If bundling: add the binary to `installer.iss`'s `[Files]`, wire it into `mod_installer.py`'s archive dispatch (`is_supported_archive`/`_archive_names`/`_safe_extract_archive`) alongside the existing zip/7z handling, likely via Python's `rarfile` library pointed at the bundled binary.
* [ ] Update `InstallFromFileDialog.tsx`'s `accept` attribute and help text once implemented.
* [ ] Update the Nexus download validation/error messages in `app/routes/mods.py` to stop rejecting `.rar` once it's actually supported.

---

## Files Modified

None yet - ticket created for planning only, not implemented.

---

## Testing

Not started.

---

## Notes

Created alongside TICKET-0142 through TICKET-0146 (same user feedback batch) but deliberately scoped out since it needs a packaging/licensing decision rather than just code.
