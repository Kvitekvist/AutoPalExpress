# Dashboard

The Dashboard is the first page you see - a live overview of your server's vitals and who's currently playing.

![Dashboard screenshot placeholder](../images/wiki/dashboard.png)
*(Screenshot placeholder - drop a real screenshot at `images/wiki/dashboard.png`)*

## What you can do here

- See the server's current state at a glance (online, offline, starting, stopping, restarting).
- Check the active map, uptime, and when the world was last saved.
- Monitor live stats: CPU usage, RAM usage, tick rate (server performance), players online out of the max allowed, the running server build version, and how many mods are installed.
- View the connected player roster, and kick or ban a player directly from the list.

If no server has been deployed or imported yet, the Dashboard shows a banner linking to [Settings](settings.md) to get one set up.

## Notes

- Stats update automatically every few seconds while the page is open - no need to refresh.
- Whisper and teleport are shown as concepts in the player list, but Palworld's REST API doesn't provide real commands for either, so they don't do anything yet.
