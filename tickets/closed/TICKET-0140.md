# TICKET-0140

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-14

---

## Description

Dashboard traffic lights for Game Port / Steam Query Port / Remote Access showed yellow whenever no UPnP-capable router was detected, even after the super admin had manually forwarded the port and confirmed in Super Admin that the firewall wasn't blocking it. Add an explicit, persisted "Mark as Verified" toggle in Super Admin (Port Forward panel + Remote Access panel) so a human confirmation can turn that yellow into green - the app itself has no way to test real internet reachability without a UPnP-reported mapping, so this is a deliberate claim, not an automated check.

---

## Reason

Direct user request: "the traffic lights in network status show yelllow light, but in super admin it has detected that the ports are not blocking. i think maybe its yellow because it says it cant detect upnp. but if it verified the ports are open and firewall are open, then it should be green." Clarified via AskUserQuestion: user chose "Add a 'Mark as Verified' toggle in Super Admin" over auto-relaxing the yellow condition, since the app can't actually verify reachability on its own without UPnP.

---

## Implementation Plan

* [x] `app/services/network_verification.py` (new): stores a manual "verified working" claim per exact port number - `gamePort`/`queryPort` via per-instance storage (`app/services/instance_storage.py`), `adminPort` via global storage (`app/storage.py`, since the admin port isn't per-instance). Verification is keyed to the exact port so it auto-invalidates if the configured port later changes.
* [x] `app/routes/network.py`: `upnp_status()` now returns `gameVerified`/`queryVerified`/`adminVerified`; added `POST/DELETE /verify/game`, `/verify/query`, `/verify/admin`.
* [x] `web/src/types/models.ts`: `UpnpStatus` gains `gameVerified`/`queryVerified`/`adminVerified`.
* [x] `web/src/api/networkApi.ts`: `verifyGamePort`/`unverifyGamePort`, `verifyQueryPort`/`unverifyQueryPort`, `verifyAdminPort`/`unverifyAdminPort`.
* [x] `web/src/components/settings/PortForwardPanel.tsx`: "Mark as Verified"/"Verified Working" button (with hint text) under the manual-forward instructions for both game and query ports, shown only in the no-UPnP branch.
* [x] `web/src/components/settings/RemoteAccessPanel.tsx`: same pattern for the admin port.
* [x] `web/src/components/dashboard/NetworkStatusLights.tsx`: `colorFor()` now takes a `verified` flag - when UPnP isn't available, yellow only if not verified, green if verified. A mapping pointed at a different machine still always stays yellow regardless of verification. Updated the traffic-light hint text to mention the verified-green path.

---

## Files Modified

* `app/services/network_verification.py` (new)
* `app/routes/network.py`
* `web/src/types/models.ts`
* `web/src/api/networkApi.ts`
* `web/src/components/settings/PortForwardPanel.tsx`
* `web/src/components/settings/RemoteAccessPanel.tsx`
* `web/src/components/dashboard/NetworkStatusLights.tsx`

---

## Testing

* `python -m py_compile app/services/network_verification.py app/routes/network.py` - passes.
* Direct Python round-trip test of `network_verification.py`'s get/set/clear for game, query, and admin ports, including confirming a port mismatch correctly reads back as unverified.
* `npx tsc --noEmit` - passes.
* `npm run build` - passes.
* Not tested via a real authenticated HTTP round-trip (routes require a super-admin session); the router is already `require_super_admin`-gated at a higher level in `main.py`, matching this file's other routes.

---

## Result

Once a super admin has manually forwarded a port and confirms it works, they can mark it verified in Super Admin, and the Dashboard traffic light shows green instead of a permanent yellow.

---

## Closed

2026-07-14
