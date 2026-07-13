# TICKET-0126

**Status**

Open

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Add a "Shut Down Server & Sleep PC" action: stop the active Palworld server (same as the existing Stop control) and then put the host's Windows machine to sleep, in one step.

---

## Reason

Direct user request: "One major feature request-- could we get something like 'shutdown server & sleep PC'? I don't want to leave my PC on 24/7 and it'd be nice if I could have my friend shut off the server and then my PC can sleep for the night/weekend rather than keep running." The host doesn't want to leave the machine running around the clock just to keep the server available, and wants a trusted friend to be able to wind things down remotely without needing physical access to the host's PC.

---

## Implementation Plan (not started - ticket only, per user request)

* [ ] Backend: a new action that (1) stops the active server the same way the existing Stop control does (REST shutdown first, then process cleanup, matching `server_control.py`'s existing stop path), then (2) sleeps the machine. Windows sleep is normally invoked via `SetSuspendState` (`powrprof.dll`) - needs research into what's required for it to actually work reliably (e.g. hybrid sleep/fast startup interactions, whether `SeShutdownPrivilege`-style rights are needed, whether any running process can trigger it or if it needs elevation).
* [ ] Decide and confirm with the user: should this be available to regular (friend) admins, or super-admin-only? The user's own scenario is specifically "have my friend do it," which argues for regular-admin access - but sleeping the host's PC is a more impactful system-level action than anything a regular admin can currently do, so this is worth confirming explicitly rather than assuming either way.
* [ ] Frontend: likely a new button/confirmation dialog on Server Control (or Dashboard) - needs a clear confirmation step given it's an irreversible-feeling action (the server goes offline and the host's PC stops responding until someone wakes it).
* [ ] Consider: what happens to AutoPalExpress itself across sleep/wake - does it need to reconnect/resume automatically on wake (Windows startup recovery, TICKET-0037, already covers *reboot*, but sleep/wake is a different lifecycle - the process isn't restarted, just suspended, so this may already just work without changes, but should be verified).
* [ ] Consider: does waking the PC remotely (Wake-on-LAN) belong in the same feature, or is that explicitly out of scope (the user only asked to *sleep* it, presumably waking it themselves when they're back)?

---

## Files Modified

None yet - ticket created for planning only, not implemented.

---

## Testing

Not started.

---

## Notes

Created per explicit user request, implementation deliberately not started yet (matches this project's workflow for planning-only ticket requests).
