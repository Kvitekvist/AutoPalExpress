# TICKET-0073

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-10

---

## Description

Two follow-ups from user feedback right after testing the 1.0.3 build:

1. The Sidebar's "Host Controls" divider (TICKET-0070) was too subtle to notice - the user reported "there is no host controls section under super admin" while actually looking at a page where the crown-badged nav items themselves were rendering correctly. The divider itself (a thin 1px gradient line + tiny icon) just didn't read as a labeled section.
2. The Steam Query Port field (TICKET-0069) was placed in Super Admin's "Share With Friends" panel alongside the game port. The user asked for it to live under Launcher Options instead, where the other Palworld launch arguments (`-useperfthreads`, `-publiclobby`, `-publicip`, `-publicport`, etc.) already live - `-queryport` is exactly the same kind of thing.

---

## Reason

Direct user feedback after testing the 1.0.3 installer build.

---

## Implementation Plan

* [x] `Sidebar.tsx`: replaced the thin-line divider with a solid gold-bordered pill/badge (crown icon + bold "HOST CONTROLS" text, tinted background) so it reads as an unmistakable labeled section instead of a subtle line.
* [x] Moved the editable Steam Query Port field from `PortForwardPanel.tsx` (Super Admin) to `LauncherFlags.tsx` (Launcher Options), styled like the existing `-publicip`/`-publicport` bordered blocks, with its own Save button calling the same `POST /api/instances/{id}/query-port` endpoint from TICKET-0069.
* [x] `PortForwardPanel.tsx` now shows the query port read-only (for reference while doing the firewall/forward steps there) instead of owning its own edit control, with a note pointing to Launcher Options as where to change it.
* [x] Removed now-unused state/handlers (`instanceId`, `savedQueryPort`, `savingQueryPort`, `handleSaveQueryPort`, `handleQueryPortChange`) from `PortForwardPanel.tsx` after the edit control moved out.
* [x] Added/updated translations for the moved and reworded strings across all 5 non-English locales.

---

## Files Modified

* `web/src/components/layout/Sidebar.tsx`
* `web/src/pages/LauncherFlags.tsx`
* `web/src/components/settings/PortForwardPanel.tsx`
* `web/src/i18n/locales/{zh-Hans,ja,de,fr,es}.json`

---

## Testing

`npm run build` passed clean. Confirmed via `curl` that the backend serves the freshly built JS/CSS bundle hash. Not yet visually confirmed by the user in the rebuilt installer (that's the next step after this ticket).

---

## Result

The Host Controls section is now a solid, unmistakable gold badge in the Sidebar. The Steam Query Port is now edited in Launcher Options next to the other launch arguments, with Super Admin showing it read-only for context during port forwarding.

---

## Closed

2026-07-10
