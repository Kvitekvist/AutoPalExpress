# Ticket Memory

This file provides a quick overview of completed work.

Append entries only.

---

## Completed Tickets

All work before TICKET-0001 was done directly through conversation and recorded in `memory/architecture.md`, `memory/decisions.md`, and `memory/project_memory.md` instead of numbered tickets - don't retroactively invent ticket numbers for that untracked work, since that would create a false impression of a history that didn't actually happen this way. The ticket system starts fresh from TICKET-0001 below.

* **TICKET-0001** (2026-07-06, Bug) - Server could launch on a stale port instead of the one actually configured, because `instances.json`'s stored `gamePort` and the live `PalWorldSettings.ini`'s `PublicPort` could disagree with nothing reconciling them. World Settings' "Game Port" field is now the single place the port is edited; starting a server enforces that port into the ini (self-healing if missing) and syncs it back into `instances.json`.
* **TICKET-0002** (2026-07-06, Bug) - `palworld_settings._get_field`/`_set_field` couldn't see a key that was the first field in `OptionSettings=(...)`, found while building TICKET-0001's self-heal path. Fixed the lookbehind to also accept start-of-string.
* **TICKET-0003** (2026-07-06, Bug) - Neither `RemoteAccessPanel` nor `PortForwardPanel` could show or remove a UPnP port mapping unless *that browser session* had just created it - `forwarded` was local-only React state, never derived from the router's actual mapping. Added `upnp.get_port_mapping()` (`GetSpecificPortMappingEntry`) and exposed real mapping state (including which machine currently holds it) via `/network/upnp/status`, so a mapping from another machine or an earlier session can now be seen and removed - the actual problem reported (router's own UI couldn't remove a UPnP-added entry, and neither could this tool until now).
* **TICKET-0004** (2026-07-06, Enhancement) - Follow-up UI reorg after reviewing the TICKET-0003 build: moved the active server's disk path from Dashboard (visible to all admins) to Super Admin (role-gated); removed the "Game Port" field from World Settings and made Super Admin's "Share With Friends" port field the one and only place to view/edit/save a server's actual port; removed `ServerConnectionPanel` and its mock API entirely (confirmed with the user it was dead, non-functional leftover UI with no real backend, not something to relocate).

---

Continue adding completed tickets in chronological order.
