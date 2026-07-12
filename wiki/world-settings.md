# World Settings

Edit the active server's real `PalWorldSettings.ini` from the browser, with grouped sections, tooltips, and guided dropdowns instead of hand-editing a config file.

![World Settings screenshot placeholder](../images/wiki/world-settings.png)
*(Screenshot placeholder - drop a real screenshot at `images/wiki/world-settings.png`)*

## What you can do here

Settings are grouped into readable sections:

- **Identity and Access** - server name, passwords, player limits.
- **World Rules** - difficulty, randomizer options, and other core rules.
- **Combat** - damage rates, PvP settings, kill-drop configuration.
- **Progression** - XP rate, stat-point allocation, and related settings.
- **Time and Survival** - day/night speed, hunger/stamina, death penalties.
- **World Density** - Pal spawn rate and related density options.
- **Bases and Work** - base building and Pal work settings.
- **Saving and Backups** - auto-save behavior.
- **Performance Limits** - server-side performance tuning.
- **Mods and Compatibility** - settings related to mod support.
- **Other** - anything not yet grouped above; still editable.

Every field shows a tooltip explaining what it does, with concrete low/default/high example values where relevant. Categorical fields (like Difficulty or Death Penalty) show a dropdown of Palworld's real accepted values instead of a free-text box.

## Notes

- Changes are written to the real `.ini` file. Restart the server for changes to take effect.
- A few settings intentionally live elsewhere instead of here: the server's game port and public IP/port are set from [Super Admin](super-admin.md) and [Launcher Options](launcher-options.md), so there's exactly one place to edit them.
