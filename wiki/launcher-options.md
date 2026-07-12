# Launcher Options

*Visible only to the super admin, under Host Controls.*

Per-server startup arguments passed to Palworld's dedicated server process.

![Launcher Options screenshot placeholder](../images/wiki/launcher-options.png)
*(Screenshot placeholder - drop a real screenshot at `images/wiki/launcher-options.png`)*

## What you can do here

- Toggle Palworld's performance flags: `-useperfthreads`, `-NoAsyncLoadingThread`, and `-UseMultithreadForDS`.
- Show the server in Palworld's public Community Server list (`-publiclobby`).
- Enable and set a separate Steam Query Port, kept distinct from the game port to avoid a known Steam/Palworld port collision.
- Override the public IP and/or public port shown to the Community Server list - these read their actual values from [Super Admin](super-admin.md)'s network settings, so there's still only one place the real values are set.

## Notes

- Restart the server for any launcher option change to take effect.
- The query port defaults to off; only enable it if you specifically need Steam server-query tools to work over a separate port from the game port.
