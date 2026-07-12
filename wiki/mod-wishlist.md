# Mod Wishlist

*Visible only to the super admin, under Host Controls.*

Lets regular admins suggest Nexus mods without ever touching the super admin's saved Nexus API key.

![Mod Wishlist screenshot placeholder](../images/wiki/mod-wishlist.png)
*(Screenshot placeholder - drop a real screenshot at `images/wiki/mod-wishlist.png`)*

## What you can do here

- See every mod a regular admin has requested from the [Mods](mods.md) page's Nexus browser.
- **Approve** a request - this uses the super admin's saved Nexus Premium key to download and install the mod.
- **Deny** a request to remove it from the list.
- Duplicate requests for the same mod are automatically suppressed.

## Why it works this way

Regular admins can browse and request public Nexus mod metadata, but they never get access to the saved Nexus API key directly. Only the super admin's explicit approval can use that key to download and install a mod. This keeps every authenticated Nexus action strictly limited to the super admin, in line with Nexus Mods' Acceptable Use Policy for API keys.
