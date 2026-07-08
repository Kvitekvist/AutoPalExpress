# TICKET-0029

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-08

---

## Description

Nexus Browse cards opened non-working Nexus links and showed "Verified File Install" as a button-like control even though verified installs require downloading the file on Nexus first and uploading it from Super Admin.

---

## Reason

The GraphQL mod mapper generated `https://www.nexusmods.com/games/palworld/mods/...` instead of the public `https://www.nexusmods.com/palworld/mods/...` page URL. The card UI also made the manual verification flow look like a one-click install action.

---

## Implementation Plan

* [x] Generate the correct Nexus mod-page URL.
* [x] Replace the misleading "Verified File Install" control with an Installed state, a Super Admin "Install File" shortcut, or a "Super Admin Only" notice.
* [x] Update release records and verify the frontend/backend build paths.

---

## Files Modified

* `app/routes/nexus.py`
* `web/src/components/mods/NexusModCard.tsx`
* `web/src/components/mods/NexusModBrowser.tsx`
* `build_installer.ps1`
* `.gitignore`
* `requirements.txt`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* `npm.cmd run build`
* `python -m compileall app\routes\nexus.py`
* Fresh `.venv312` backend import check
* `build_installer.ps1`

---

## Result

Nexus Browse cards now open the real Nexus mod page and clearly direct users through the supported verified manual file install flow.

---

## Notes

Direct Nexus downloads remain paused for public release pending Nexus registered app/OAuth approval.

---

## Closed

2026-07-08
