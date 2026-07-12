# Super Admin

*Visible only to the super admin, under Host Controls.*

Anything that changes this machine's network exposure, who can reach it, or what external accounts it's connected to lives here.

![Super Admin screenshot placeholder](../images/wiki/super-admin.png)
*(Screenshot placeholder - drop a real screenshot at `images/wiki/super-admin.png`)*

## What you can do here

- **Active Server** - see which server is currently selected and its folder path on disk.
- **Local API** - Palworld REST API settings used for Dashboard stats, player actions, and scheduled tasks.
- **Mod File Uploads** - install a mod from a file you already downloaded from Nexus yourself; AutoPalExpress verifies the file's exact hash against Nexus's own catalog before installing it.
- **Port Forwarding** - view and manage UPnP port mappings for the game port (and query port, if enabled).
- **Remote Access** - manage remote/admin-panel port exposure so friends can reach the panel itself.
- **Diagnostics** - run the bundled diagnostics tool from inside the app and see the report inline, without needing the separate Start Menu shortcut.
- **Nexus Integration** - connect a Nexus Mods Premium API key to enable one-click direct installs (used only by this page and by approving [Mod Wishlist](mod-wishlist.md) requests).

## Notes

- Everything on this page is reserved for the super admin - the saved Nexus API key, real ports, and Windows Firewall rules are all treated as super-admin-only capabilities, same as account management.
- If port-forwarded, remember the admin panel itself uses plain HTTP by default - see the README's Remote Access and Security section for safer alternatives (Tailscale, ZeroTier, a VPN, or a reverse proxy with real HTTPS).
