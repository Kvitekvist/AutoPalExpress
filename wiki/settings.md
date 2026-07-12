# Settings

*Visible only to the super admin, under Host Controls.*

Manage server instances, admin accounts, automation, and startup behavior for AutoPalExpress itself.

![Settings screenshot placeholder](../images/wiki/settings.png)
*(Screenshot placeholder - drop a real screenshot at `images/wiki/settings.png`)*

## What you can do here

- **Startup Recovery** - start AutoPalExpress automatically when Windows signs in, and auto-start the active server when the app launches, so the server comes back after a reboot or power loss.
- **Users** - generate invite codes so trusted friends can register their own regular admin account.
- **Server Instances** - deploy a brand-new server with SteamCMD, import an existing one, switch which server is active, open a server's folder in Explorer, or unregister/delete a server.
- **Automation** - schedule recurring backups and scheduled restarts.

## Notes

- Duplicate server records (e.g. from re-importing the same install) are automatically deduplicated by folder path.
- Deleting a server's files only happens through the explicit "Remove and Delete" action, and only while that server is stopped.
