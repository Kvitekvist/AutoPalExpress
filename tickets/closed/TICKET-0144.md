# TICKET-0144

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

Nexus mod search was very limited - it only ever filtered the 60 mods already loaded into the Trending/Latest Added/Latest Updated tabs, client-side, by substring. A mod that wasn't currently trending or recently added/updated could never be found by searching for it at all, no matter how popular or well-known it was. Replaced with a real server-side search against Nexus's own GraphQL API.

---

## Reason

Direct user feedback (mod-installation report, 2026-07-14): "Nexus mod search is very limited, missing most searched-for mods."

---

## Implementation Plan

* [x] `app/services/nexus_client.py`: added `search_mods(query)` using Nexus's GraphQL `ModsFilter.name` field with `op: WILDCARD` - confirmed by direct experimentation against the live API that this does real case-insensitive substring matching on the mod name with no wildcard characters needed in the query itself (despite the operator's name, `*`/`%` are not wildcard tokens here).
* [x] `app/routes/nexus.py`: added `GET /api/integrations/nexus/search?q=...`, reusing the existing `_map_mod_summary` shape so the frontend needs no new types.
* [x] `web/src/api/nexusApi.ts`: added `searchMods(query)`.
* [x] `web/src/components/mods/NexusModBrowser.tsx`: once the search box has 2+ characters, debounces 400ms then calls the new search endpoint and shows those results instead of the current tab's cached list (with a hint that it's searching all of Nexus, not just the active tab); category filtering still applies on top. Falls back to the old "filter the loaded tab" behavior for 0-1 character queries.

---

## Files Modified

* `app/services/nexus_client.py`
* `app/routes/nexus.py`
* `web/src/api/nexusApi.ts`
* `web/src/components/mods/NexusModBrowser.tsx`

---

## Testing

* Introspected Nexus's live GraphQL schema directly (`ModsFilter`, `BaseFilterValueEqualsWildcard`, `FilterComparisonOperatorEqualsWildcard`) to find the real search-capable field and operator, rather than guessing.
* Ran real live queries against Nexus's API for `map`, `schema`, `weight`, `infinite`, `pal schema`, `PalSchema` - confirmed genuine substring matches across mod names not limited to any particular list, including mods (e.g. "UPDATED - Infinite Weight In Camp") that would never appear in the top-60 trending/latest results.
* `npx tsc --noEmit` and `npm run build` pass.
* Not tested through the actual browser UI (no interactive desktop in this sandbox) - the underlying API call and data flow are verified directly.

---

## Result

Searching the Mods page now searches all of Nexus Mods by name, not just whatever happened to already be loaded into the Trending/Latest Added/Latest Updated tabs.

---

## Closed

2026-07-14
