# Server Control

Start, stop, restart, and manage the running Palworld dedicated server itself.

![Server Control screenshot placeholder](../images/wiki/server-control.png)
*(Screenshot placeholder - drop a real screenshot at `images/wiki/server-control.png`)*

## What you can do here

- **Start Server** - launches the active server. If you manage more than one server, use the small "Change" menu on the Start button to pick which one becomes active first.
- **Stop Server** - shuts the server down (with a confirmation, since it disconnects everyone immediately).
- **Restart Server** - stops and starts the server again, with a confirmation.
- **Save World** - forces an immediate world save without restarting.
- **Check Updates** - asks Steam whether a newer Palworld Dedicated Server build exists, and offers to update through SteamCMD if the server is stopped.
- **Broadcast Message** - sends an instant in-game announcement to everyone currently connected.
- **Shutdown Countdown** - warns players and shuts the server down after a chosen delay (30s to 5 minutes) instead of immediately.

## Notes

- Updates can only run while the server is offline.
- Stop/Restart try Palworld's own REST shutdown path first, then clean up the local Windows process if needed.
