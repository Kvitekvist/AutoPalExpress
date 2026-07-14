# TICKET-0149

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-14

---

## Description

External code review of TICKET-0142/0144 caught two things:

1. `nexus_client.get_mod_list`/the new `search_mods` (TICKET-0144) both requested a hardcoded single page of 60 entries from Nexus's GraphQL API with no pagination - a broad search or a popular list could easily have hundreds of matches, and anything past the first 60 (sorted by downloads) was simply unreachable, no matter how the query was worded. Confirmed live: a search for "schema" alone has 129 total matches on Nexus, more than double what the old hardcoded page could show.
2. Whether the Palworld-specific UE4SS fork (TICKET-0142) differs from upstream only in source code, or also ships a custom `MemberVariableLayout.ini` (required for Palworld's Enum handling - without it, mods that access Enums crash or fail to load per `UE4SS-RE/RE-UE4SS#802`). Investigated and confirmed: the source-code diff between the fork and upstream really is small (2 files, thread/proxy-enumeration related), but the fork's *release zip* bundles a large (37.8 KB), clearly game-specific `ue4ss/MemberVariableLayout.ini` that isn't part of that source diff. TICKET-0142's installer already copies the release zip's contents wholesale rather than cherry-picking files, so this file was already being installed correctly - confirmed byte-for-byte via a direct extraction test. No code change was needed for this half of the review; documenting it here since it was a real, valid question that needed verifying, not assuming.

---

## Reason

External code review feedback on TICKET-0142/0144, referencing `app/services/nexus_client.py#L111` and comparing `Okaetsu/RE-UE4SS` against `UE4SS-RE/RE-UE4SS`, plus `UE4SS-RE/RE-UE4SS#802`.

---

## Implementation Plan

* [x] `app/services/nexus_client.py`: consolidated `get_mod_list`/`search_mods` onto a shared `_mods_page()` helper using GraphQL's real `offset` argument (confirmed via schema introspection) and requesting `totalCount` from the `ModPage` response type, so callers can page through the rest of the results instead of only ever seeing a fixed first 60.
* [x] `app/routes/nexus.py`: `GET /mods` and `GET /search` both take an `offset` query param and return `{"results": [...], "totalCount": N}` instead of a bare list.
* [x] `web/src/types/models.ts`: added `NexusModPage`.
* [x] `web/src/api/nexusApi.ts`: `getModList`/`searchMods` now take an optional `offset` and return `NexusModPage`.
* [x] `web/src/components/mods/NexusModBrowser.tsx`: both the tab lists and search now accumulate pages in state (`{items, totalCount}`) instead of a bare array, with a "Load More (N of Total)" button shown whenever more results exist server-side than are currently loaded.
* [x] MemberVariableLayout.ini: verified only (see Description) - no code change needed, TICKET-0142's whole-zip install already handles it correctly.

---

## Files Modified

* `app/services/nexus_client.py`
* `app/routes/nexus.py`
* `web/src/types/models.ts`
* `web/src/api/nexusApi.ts`
* `web/src/components/mods/NexusModBrowser.tsx`

---

## Testing

* Introspected Nexus's GraphQL schema directly to confirm the `mods` query's real `offset` argument and the `ModPage.totalCount` field exist.
* Live API test: paginated a "weight" search (14 total matches) and a "schema" search (129 total matches) across two pages each, confirming zero overlap between pages and correct `totalCount` reporting.
* Live API test: fetched `MemberVariableLayout.ini` directly from the real release zip (37,857 bytes, clearly a real UStruct/UObject memory-layout dump, not a stub) and re-ran `ue4ss_installer._extract_and_merge` against it directly, confirming the installed copy is byte-for-byte identical (same size) to the source.
* Fetched the actual `Okaetsu/RE-UE4SS` vs `UE4SS-RE/RE-UE4SS` compare page and the linked GitHub issue directly rather than assuming the reviewer's claim was correct or incorrect.
* `python -m py_compile`, `npx tsc --noEmit`, and `npm run build` all pass.

---

## Result

Nexus search and the tab lists can now page through all matching results instead of being capped at a fixed first 60, and the Palworld-specific `MemberVariableLayout.ini` requirement was confirmed already handled correctly by TICKET-0142's whole-zip install approach.

---

## Closed

2026-07-14
