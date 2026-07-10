# TICKET-0059

**Status**

Closed

**Type**

Documentation

**Priority**

Low

**Created**

2026-07-10

---

## Description

Add the local Getting Started screenshot files to git so GitHub can render them.

---

## Reason

The screenshots existed in the local `images/` folder but were untracked, so they could not appear on GitHub after pushing the guide.

---

## Implementation Plan

* [x] Check the screenshot filenames referenced by `GETTING_STARTED.md`.

* [x] Add the available screenshot assets under `images/`.

* [x] Record which filenames are still missing.

* [x] Update changelog and project memory.

---

## Files Modified

* `images/UAC.png`
* `images/getting-started-01-installer-start.png`
* `images/getting-started-01-installer-start_2.png`
* `images/getting-started-06-start-server.png`
* `images/getting-started-07-dashboard-online.png`
* `images/getting-started-08-game-port.png`
* `images/getting-started-10-launcher-options.png`
* `images/getting-started-11-world-settings.png`
* `images/getting-started-12-mods.png`
* `images/getting-started-13-invite-users.png`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

Compared local image filenames with the image paths referenced by `GETTING_STARTED.md`.

---

## Result

Available screenshot files were added to git. Remaining missing guide image paths are:

* `images/getting-started-02-installer-startup.png`
* `images/getting-started-03-admin-account.png`
* `images/getting-started-04-server-choice.png`
* `images/getting-started-05-install-folder.png`
* `images/getting-started-09-router-port-forward.png`
* `images/getting-started-14-diagnostics.png`

---

## Notes

`AGENTS.md` was left untracked.

---

## Closed

2026-07-10
