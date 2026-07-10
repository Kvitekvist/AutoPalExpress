# TICKET-0060

**Status**

Closed

**Type**

Release

**Priority**

Medium

**Created**

2026-07-10

---

## Description

Rebuild the packaged executable and installer so the World Settings toggle layout fix from TICKET-0058 is included in the installed app.

---

## Reason

The source code already renders boolean settings with the field title above and `Enable`/`Disable` inside the toggle box, but the installed app can still show the old compiled frontend until the executable/installer is rebuilt.

---

## Implementation Plan

* [x] Confirm the source layout is correct.

* [x] Rebuild frontend, executable, and installer.

* [x] Refresh installer checksum.

* [x] Update changelog and memory.

---

## Files Modified

* `README.md`
* `CHANGELOG.md`
* `installer_output/CHECKSUMS.txt`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* Confirmed the generated frontend bundle contains `Enable` / `Disable`.
* Refreshed SHA-256 for `installer_output\PalworldServerAdmin-Setup.exe`.

---

## Result

Rebuilt `installer_output\PalworldServerAdmin-Setup.exe` with the corrected World Settings toggle layout. New SHA-256:

```text
6636805A7374892F3A9EE146CCF08C7461C3FE129BC396FB0C8F83933600B9DF
```

---

## Notes

This is a packaging/release ticket for an already-implemented UI fix.

---

## Closed

2026-07-10
