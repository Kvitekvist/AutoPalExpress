"""Writes the server name (and a few other basics) into a freshly deployed
server's PalWorldSettings.ini.

Rather than hand-maintaining Palworld's full OptionSettings schema (a single
line with dozens of fields, which would go stale and risk typos every game
update), this copies the install's own DefaultPalWorldSettings.ini - which
ships with every server install and always matches the installed version -
and only overwrites the handful of fields this tool actually sets.
"""

import re
import secrets
from pathlib import Path
from typing import Any

_OPTION_LINE_RE = re.compile(r"^OptionSettings=\((.*)\)\s*$", re.MULTILINE)


def _default_template_path(server_path: Path) -> Path:
    return server_path / "DefaultPalWorldSettings.ini"


def _settings_ini_path(server_path: Path) -> Path:
    return server_path / "Pal" / "Saved" / "Config" / "WindowsServer" / "PalWorldSettings.ini"


def _set_field(option_body: str, key: str, value: str) -> str:
    # Matches key=value at the start of the body or right after a comma - not
    # just after a comma - since option_body is the *inside* of
    # OptionSettings=(...) with the opening paren already stripped, so the
    # very first field has nothing but the start of the string before it.
    pattern = re.compile(rf'(?:^|(?<=[,(])){re.escape(key)}=(?:"[^"]*"|[^,()]*)')
    if pattern.search(option_body):
        return pattern.sub(f"{key}={value}", option_body, count=1)
    if not option_body:
        return f"{key}={value}"
    return option_body.rstrip() + f",{key}={value}"


def _get_field(option_body: str, key: str) -> str | None:
    match = re.search(rf'(?:^|(?<=[,(])){re.escape(key)}=("[^"]*"|[^,()]*)', option_body)
    return match.group(1) if match else None


def _read_ini_int_field(server_path: Path, key: str) -> int | None:
    """Reads a numeric field from a live PalWorldSettings.ini, if one exists -
    this can differ from whatever this tool last wrote, since the file can
    also be edited by hand or by the game itself."""
    ini_path = _settings_ini_path(server_path)
    if not ini_path.is_file():
        return None
    text = ini_path.read_text(encoding="utf-8-sig")
    match = _OPTION_LINE_RE.search(text)
    if not match:
        return None
    value = _get_field(match.group(1), key)
    return int(value) if value and value.isdigit() else None


def read_public_port(server_path: Path) -> int | None:
    return _read_ini_int_field(server_path, "PublicPort")


def effective_game_port(server_path: Path, fallback_port: int) -> int:
    """The port a server will actually bind to: whatever's live in its ini,
    since that's what World Settings edits (falling back to the port an
    instance was created/deployed with only if the ini doesn't exist yet or
    has no PublicPort field). Read-only - use enforce_game_port() at launch
    time, where writing that fallback into the ini is actually wanted."""
    return read_public_port(server_path) or fallback_port


def enforce_game_port(server_path: Path, fallback_port: int, *, prefer_fallback: bool = False) -> int:
    """The one point where the port a server is about to start on gets
    decided and enforced. By default, the ini's own PublicPort wins if it is
    already set; when prefer_fallback is true, the caller's remembered Super
    Admin port is written back into the ini so reinstall/update does not drift
    back to Palworld's default."""
    existing = read_public_port(server_path)
    if existing is not None and (not prefer_fallback or existing == fallback_port):
        return existing

    text = _read_live_or_template_text(server_path)
    match = _OPTION_LINE_RE.search(text)
    body = _set_field(match.group(1) if match else "", "PublicPort", str(fallback_port))
    _write_option_body(server_path, text, match, body)
    return fallback_port


def read_max_players(server_path: Path) -> int | None:
    return _read_ini_int_field(server_path, "ServerPlayerMaxNum")


def read_rest_config(server_path: Path) -> dict[str, Any] | None:
    """Returns {"enabled", "port", "password"} for Palworld's REST API.
    The REST API uses the same AdminPassword as other admin operations."""
    ini_path = _settings_ini_path(server_path)
    if not ini_path.is_file():
        return None
    text = ini_path.read_text(encoding="utf-8-sig")
    match = _OPTION_LINE_RE.search(text)
    if not match:
        return None
    body = match.group(1)
    port_raw = _get_field(body, "RESTAPIPort")
    password_raw = _get_field(body, "AdminPassword")
    return {
        "enabled": _get_field(body, "RESTAPIEnabled") == "True",
        "port": int(port_raw) if port_raw and port_raw.isdigit() else None,
        "password": password_raw[1:-1] if password_raw and password_raw.startswith('"') else password_raw,
    }


def _read_live_or_template_text(server_path: Path) -> str:
    dest_path = _settings_ini_path(server_path)
    if dest_path.is_file():
        return dest_path.read_text(encoding="utf-8-sig")
    return _read_ini_or_template_text(server_path)


def _new_admin_password() -> str:
    return secrets.token_urlsafe(18)


def enforce_rest_api(server_path: Path, fallback_port: int) -> dict[str, Any]:
    """Ensures the Palworld REST API is enabled before launch. The existing
    instance field is still named rconPort for backward compatibility, but it
    now represents this tool's local management API port. Palworld requires
    AdminPassword for REST Basic Auth, so fill one only when it is missing or
    blank and leave user-set passwords alone."""
    text = _read_live_or_template_text(server_path)
    match = _OPTION_LINE_RE.search(text)
    body = match.group(1) if match else ""
    port_raw = _get_field(body, "RESTAPIPort")
    port = int(port_raw) if port_raw and port_raw.isdigit() else fallback_port
    password_raw = _get_field(body, "AdminPassword")
    password = password_raw[1:-1] if password_raw and password_raw.startswith('"') else password_raw
    body = _set_field(body, "RESTAPIEnabled", "True")
    body = _set_field(body, "RESTAPIPort", str(port))
    password_generated = False
    if not password:
        password = _new_admin_password()
        body = _set_field(body, "AdminPassword", f'"{password}"')
        password_generated = True
    _write_option_body(server_path, text, match, body)
    return {"port": port, "passwordGenerated": password_generated}


def _read_ini_or_template_text(server_path: Path) -> str:
    """Prefers the install's own template (always matches the installed game
    version) over a pre-existing live ini, since this is only used right
    before overwriting specific fields in either - falls back to a minimal
    skeleton for a from-scratch write if neither exists yet."""
    template_path = _default_template_path(server_path)
    if template_path.is_file():
        return template_path.read_text(encoding="utf-8-sig")
    dest_path = _settings_ini_path(server_path)
    if dest_path.is_file():
        return dest_path.read_text(encoding="utf-8-sig")
    return "[/Script/Pal.PalGameWorldSettings]\nOptionSettings=()\n"


def _write_option_body(server_path: Path, text: str, match: re.Match[str] | None, body: str) -> None:
    dest_path = _settings_ini_path(server_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    new_line = f"OptionSettings=({body})"
    if match:
        text = text[: match.start()] + new_line + text[match.end() :]
    else:
        text = text.rstrip() + "\n" + new_line + "\n"
    dest_path.write_text(text, encoding="utf-8")


def initialize_settings(
    server_path: Path,
    *,
    server_name: str,
    game_port: int,
    rcon_port: int | None = None,
    max_players: int | None = None,
) -> Path:
    text = _read_ini_or_template_text(server_path)
    match = _OPTION_LINE_RE.search(text)
    body = match.group(1) if match else ""

    body = _set_field(body, "ServerName", f'"{server_name}"')
    body = _set_field(body, "PublicPort", str(game_port))
    if rcon_port is not None:
        body = _set_field(body, "RESTAPIPort", str(rcon_port))
        body = _set_field(body, "RESTAPIEnabled", "True")
    if max_players is not None:
        body = _set_field(body, "ServerPlayerMaxNum", str(max_players))

    _write_option_body(server_path, text, match, body)
    return _settings_ini_path(server_path)


# --- Full settings editor -----------------------------------------------
#
# Rather than hand-maintaining every one of Palworld's ~100 OptionSettings
# fields (guaranteed to go stale across game updates), field type is
# inferred from how Palworld itself formatted the value (True/False -> bool,
# a bare integer -> int, etc.) so *every* field is readable/writable even
# without curated metadata for it. A small curated list gives good labels
# and groups the commonly-changed ones at the top; anything else still
# shows up with an auto-generated label instead of being silently dropped.

def _option(value: str, label: str, description: str) -> dict[str, str]:
    return {"value": value, "label": label, "description": description}


_DIFFICULTY_OPTIONS = [
    _option("None", "None", "Palworld's default custom-server mode."),
    _option("Easy", "Easy", "A softer preset if the installed server supports it."),
    _option("Normal", "Normal", "Standard preset if the installed server supports it."),
    _option("Hard", "Hard", "A harsher preset if the installed server supports it."),
]
_DEATH_PENALTY_OPTIONS = [
    _option("None", "None", "No item or Pal drops on death."),
    _option("Item", "Items", "Drop inventory items, but keep equipment and Pals."),
    _option("ItemAndEquipment", "Items and equipment", "Drop inventory items and equipped gear."),
    _option("All", "Everything", "Drop inventory, equipment, and Pals on your team."),
]
_RANDOMIZER_OPTIONS = [
    _option("None", "None", "No Pal spawn randomization."),
    _option("Region", "Region", "Randomize Pal spawns within each region."),
    _option("All", "All", "Fully randomize Pal spawns across the world."),
]
_LOG_FORMAT_OPTIONS = [
    _option("Text", "Text", "Human-readable server logs."),
    _option("Json", "JSON", "Structured logs for external tools."),
]
_CROSSPLAY_OPTIONS = [
    _option("(Steam)", "Steam only", "Only Steam clients may connect."),
    _option("(Xbox)", "Xbox only", "Only Xbox/Game Pass clients may connect."),
    _option("(PS5)", "PS5 only", "Only PlayStation 5 clients may connect."),
    _option("(Mac)", "Mac only", "Only Mac clients may connect."),
    _option("(Steam,Xbox)", "Steam + Xbox", "Allow Steam and Xbox/Game Pass clients."),
    _option("(Steam,Xbox,PS5,Mac)", "All platforms", "Allow Steam, Xbox/Game Pass, PS5, and Mac clients."),
]


POPULAR_FIELDS: list[dict[str, Any]] = [
    {
        "key": "ServerName",
        "label": "Server Name",
        "group": "Identity and Access",
        "help": "The name players see in direct connect and server lists. Restart the server after changing it.",
    },
    {
        "key": "ServerDescription",
        "label": "Server Description",
        "group": "Identity and Access",
        "help": "Short public description shown by Palworld where server details are displayed.",
    },
    {
        "key": "ServerPassword",
        "label": "Server Password",
        "sensitive": True,
        "group": "Identity and Access",
        "description": "Leave blank for no password.",
        "help": "Players need this password to join. Blank means anyone who can reach the server can attempt to join.",
    },
    {
        "key": "AdminPassword",
        "label": "Admin Password",
        "sensitive": True,
        "group": "Identity and Access",
        "description": "Needed for in-game admin commands and the local REST API.",
        "help": "AutoPalExpress uses this for Palworld REST API actions such as player list, save, broadcast, kick, and ban.",
    },
    {
        "key": "ServerPlayerMaxNum",
        "label": "Max Players",
        "group": "Identity and Access",
        "help": "Maximum connected players. Higher values allow more players but can increase CPU, RAM, and network load.",
    },
    {
        "key": "CoopPlayerMaxNum",
        "label": "Max Players Per Party",
        "group": "Identity and Access",
        "help": "Maximum players in a party/guild play group. Higher values make larger groups possible.",
    },
    {
        "key": "Difficulty",
        "label": "Difficulty",
        "group": "World Rules",
        "options": _DIFFICULTY_OPTIONS,
        "help": "Preset difficulty selector. None is the usual dedicated-server custom mode; other values only apply if the installed Palworld server recognizes them.",
    },
    {
        "key": "DeathPenalty",
        "label": "Death Penalty",
        "group": "World Rules",
        "options": _DEATH_PENALTY_OPTIONS,
        "help": "Controls what a player drops on death. Higher penalty is harsher.",
    },
    {
        "key": "bIsPvP",
        "label": "PvP Enabled",
        "group": "World Rules",
        "help": "Allows players to damage and fight each other when enabled.",
    },
    {
        "key": "bEnableFriendlyFire",
        "label": "Friendly Fire",
        "group": "World Rules",
        "help": "Allows damage to allies or friendly targets. Keep off for a safer cooperative server.",
    },
    {
        "key": "bHardcore",
        "label": "Hardcore Mode",
        "group": "World Rules",
        "help": "A harsh survival mode with permanent death consequences. Does not by itself cause Pal loss - see Permanent Pal Loss below.",
    },
    {
        "key": "bPalLost",
        "label": "Permanent Pal Loss",
        "group": "World Rules",
        "description": "Pals are lost forever on death.",
        "help": "Palworld's dedicated Pal-permadeath toggle. Independent of Hardcore Mode - either can be enabled without the other.",
    },
    {
        "key": "ExpRate",
        "label": "EXP Rate",
        "group": "Progression",
        "help": "Experience multiplier. Example: 0.5 is half-speed leveling, 1 is normal, 2 doubles earned EXP.",
    },
    {
        "key": "PalCaptureRate",
        "label": "Capture Rate",
        "group": "Progression",
        "help": "Capture chance multiplier. Example: 0.5 makes captures roughly half as likely, 1 is normal, 2 makes captures much easier.",
    },
    {
        "key": "PalSpawnNumRate",
        "label": "Pal Spawn Rate",
        "group": "World Density",
        "help": "Pal spawn multiplier. Example: 0.5 means fewer wild Pals, 1 is normal, 2 roughly doubles spawn density and server load.",
    },
    {
        "key": "PalDamageRateAttack",
        "label": "Pal Attack Damage Rate",
        "group": "Combat",
        "help": "Damage dealt by Pals. Example: 0.5 halves Pal attack damage, 1 is normal, 2 doubles it.",
    },
    {
        "key": "PalDamageRateDefense",
        "label": "Pal Defense Damage Rate",
        "group": "Combat",
        "help": "Damage taken by Pals. Example: 0.5 makes Pals take half damage, 1 is normal, 2 makes them take double damage.",
    },
    {
        "key": "PlayerDamageRateAttack",
        "label": "Player Attack Damage Rate",
        "group": "Combat",
        "help": "Damage dealt by players. Example: 0.5 halves player damage, 1 is normal, 2 doubles player damage.",
    },
    {
        "key": "PlayerDamageRateDefense",
        "label": "Player Defense Damage Rate",
        "group": "Combat",
        "help": "Damage taken by players. Example: 0.5 makes players take half damage, 1 is normal, 2 makes players take double damage.",
    },
    {
        "key": "DayTimeSpeedRate",
        "label": "Day Length Rate",
        "group": "Time and Survival",
        "help": "Daytime speed multiplier. Example: 0.5 makes daytime last longer, 1 is normal, 2 makes daytime pass twice as fast.",
    },
    {
        "key": "NightTimeSpeedRate",
        "label": "Night Length Rate",
        "group": "Time and Survival",
        "help": "Nighttime speed multiplier. Example: 0.5 makes nights last longer, 1 is normal, 2 makes nights pass twice as fast.",
    },
    {
        "key": "WorkSpeedRate",
        "label": "Work Speed Rate",
        "group": "Bases and Work",
        "help": "Work speed multiplier. Example: 0.5 slows work to half speed, 1 is normal, 2 doubles work speed.",
    },
    {
        "key": "DropItemMaxNum",
        "label": "Max Dropped Items",
        "group": "Performance Limits",
        "help": "Maximum dropped items in the world. Example: 500 keeps the world cleaner, 3000 is Palworld's common default, 5000 preserves more drops but can hurt performance.",
    },
    {
        "key": "BaseCampMaxNum",
        "label": "Max Base Camps",
        "group": "Bases and Work",
        "help": "Total bases allowed on the server. Example: 32 is restrictive, 128 is common, 256 allows many bases but increases server load.",
    },
    {
        "key": "BaseCampWorkerMaxNum",
        "label": "Max Workers Per Base",
        "group": "Bases and Work",
        "help": "Maximum Pals assigned to one base. Example: 10 is light, 15 is common, 20+ allows busier bases but increases processing load.",
    },
    {
        "key": "GuildPlayerMaxNum",
        "label": "Max Guild Size",
        "group": "Identity and Access",
        "help": "Maximum players in a guild. Example: 10 keeps guilds small, 20 is common, 32 allows larger shared groups.",
    },
    {
        "key": "AutoSaveSpan",
        "label": "Auto-Save Interval (minutes)",
        "group": "Saving and Backups",
        "help": "Minutes between automatic saves. Example: 10 saves often, 30 is moderate, 60 reduces disk activity but risks more rollback after a crash.",
    },
    {
        "key": "bIsUseBackupSaveData",
        "label": "Keep Save Backups",
        "group": "Saving and Backups",
        "help": "Palworld keeps rotating save backups. Useful for recovery, but it increases disk activity and storage use.",
    },
    {
        "key": "RESTAPIEnabled",
        "label": "REST API Enabled",
        "group": "Local API",
        "help": "Required for AutoPalExpress player list, saves, metrics, kick/ban, broadcasts, and graceful shutdown.",
    },
    {
        "key": "RESTAPIPort",
        "label": "REST API Port",
        "group": "Local API",
        "help": "Local port used by Palworld's REST API. Do not port-forward this directly; AutoPalExpress talks to it locally.",
    },
]
_POPULAR_META = {f["key"]: f for f in POPULAR_FIELDS}
_POPULAR_ORDER = {f["key"]: i for i, f in enumerate(POPULAR_FIELDS)}

_ADVANCED_META: dict[str, dict[str, Any]] = {
    "CrossplayPlatforms": {
        "label": "Crossplay Platforms",
        "group": "Identity and Access",
        "options": _CROSSPLAY_OPTIONS,
        "help": "Which client platforms may connect. All platforms is the broadest compatibility; Steam only is the most restrictive common choice.",
    },
    "LogFormatType": {
        "label": "Log Format",
        "group": "Local API",
        "options": _LOG_FORMAT_OPTIONS,
        "help": "Text is easier for humans to read. JSON is better if an external log tool parses the server output.",
    },
    "RandomizerType": {
        "label": "Pal Randomizer Mode",
        "group": "World Rules",
        "options": _RANDOMIZER_OPTIONS,
        "help": "None keeps normal spawns. Region randomizes inside regions. All fully randomizes Pal spawns across the world.",
    },
    "bIsRandomizerPalLevelRandom": {
        "label": "Randomize Pal Levels",
        "group": "World Rules",
        "help": "When enabled, randomized wild Pals can have fully random levels. When disabled, levels stay closer to each area's intended range.",
    },
    "bEnableFastTravel": {
        "label": "Fast Travel Enabled",
        "group": "World Rules",
        "help": "Allows normal fast travel when enabled.",
    },
    "bEnableFastTravelOnlyBaseCamp": {
        "label": "Fast Travel Only Between Bases",
        "group": "World Rules",
        "help": "Restricts fast travel to base camps instead of every fast-travel point.",
    },
    "bIsStartLocationSelectByMap": {
        "label": "Choose Start Location On Map",
        "group": "World Rules",
        "help": "Lets new characters choose a starting location from the map.",
    },
    "bShowPlayerList": {
        "label": "Show Player List",
        "group": "Identity and Access",
        "help": "Shows the player list in Palworld's ESC menu when enabled.",
    },
    "bAllowClientMod": {
        "label": "Allow Client Mods",
        "group": "Mods and Compatibility",
        "help": "Allows players with client mods enabled to join. More permissive, but harder to support if mod setups differ.",
    },
    "bEnableInvaderEnemy": {
        "label": "Enable Invaders",
        "group": "World Density",
        "help": "Enables invader events. Turning it off makes the world calmer.",
    },
    "bEnableVoiceChat": {
        "label": "Voice Chat Enabled",
        "group": "Identity and Access",
        "help": "Enables in-game voice chat.",
    },
    "BaseCampMaxNumInGuild": {
        "label": "Max Bases Per Guild",
        "group": "Bases and Work",
        "help": "Maximum bases one guild can own. Higher values allow larger guild infrastructure but increase server load.",
    },
    "CollectionDropRate": {
        "label": "Gathering Drop Rate",
        "group": "Progression",
        "help": "Gathered item amount multiplier. Example: 0.5 gives fewer gathered resources, 1 is normal, 2 doubles gathered drops.",
    },
    "CollectionObjectHpRate": {
        "label": "Gatherable Object HP Rate",
        "group": "Progression",
        "help": "Health of gatherable objects. Example: 0.5 makes nodes break faster, 1 is normal, 2 makes nodes take longer to break.",
    },
    "CollectionObjectRespawnSpeedRate": {
        "label": "Gatherable Respawn Rate",
        "group": "Progression",
        "help": "Gatherable respawn speed. Example: 0.5 slows resource returns, 1 is normal, 2 makes gatherables come back sooner.",
    },
    "EnemyDropItemRate": {
        "label": "Enemy Drop Rate",
        "group": "Progression",
        "help": "Enemy drop quantity multiplier. Example: 0.5 gives less loot, 1 is normal, 2 doubles enemy drops.",
    },
    "PalEggDefaultHatchingTime": {
        "label": "Egg Hatching Time (hours)",
        "group": "Progression",
        "help": "Huge Egg hatch time in hours. Example: 0 speeds eggs up heavily, 2 is short, 72 is very long.",
    },
    "SupplyDropSpan": {
        "label": "Supply Drop Interval (minutes)",
        "group": "World Density",
        "help": "Minutes between meteorite or supply-drop events. Example: 30 is frequent, 180 is moderate, 360 is rare.",
    },
    "BuildObjectDamageRate": {
        "label": "Structure Damage Rate",
        "group": "Combat",
        "help": "Damage dealt to buildings. Example: 0.5 halves structure damage, 1 is normal, 2 doubles structure damage.",
    },
    "BuildObjectDeteriorationDamageRate": {
        "label": "Building Decay Rate",
        "group": "Bases and Work",
        "help": "Building decay speed. Example: 0 disables or greatly slows decay on many servers, 1 is normal, 2 decays faster.",
    },
    "ItemWeightRate": {
        "label": "Item Weight Rate",
        "group": "Time and Survival",
        "help": "Item weight multiplier. Example: 0.5 makes items lighter, 1 is normal, 2 makes items twice as heavy.",
    },
    "PlayerStaminaDecreaceRate": {
        "label": "Player Stamina Drain Rate",
        "group": "Time and Survival",
        "help": "Player stamina drain multiplier. Example: 0.5 drains stamina slower, 1 is normal, 2 drains twice as fast.",
    },
    "PalStaminaDecreaceRate": {
        "label": "Pal Stamina Drain Rate",
        "group": "Time and Survival",
        "help": "Pal stamina drain multiplier. Example: 0.5 drains Pal stamina slower, 1 is normal, 2 drains twice as fast.",
    },
    "PlayerStomachDecreaceRate": {
        "label": "Player Hunger Drain Rate",
        "group": "Time and Survival",
        "help": "Player hunger drain multiplier. Example: 0.5 makes food last longer, 1 is normal, 2 makes hunger drain twice as fast.",
    },
    "PalStomachDecreaceRate": {
        "label": "Pal Hunger Drain Rate",
        "group": "Time and Survival",
        "help": "Pal hunger drain multiplier. Example: 0.5 makes Pal food last longer, 1 is normal, 2 makes hunger drain twice as fast.",
    },
    "PlayerAutoHPRegeneRate": {
        "label": "Player HP Regen Rate",
        "group": "Time and Survival",
        "help": "Player natural HP regeneration multiplier. Example: 0.5 heals slower, 1 is normal, 2 heals twice as fast.",
    },
    "PalAutoHPRegeneRate": {
        "label": "Pal HP Regen Rate",
        "group": "Time and Survival",
        "help": "Pal natural HP regeneration multiplier. Example: 0.5 heals slower, 1 is normal, 2 heals twice as fast.",
    },
    "ServerReplicatePawnCullDistance": {
        "label": "Pal Sync Distance",
        "group": "Performance Limits",
        "help": "Distance in centimeters for syncing Pals to players. Example: 10000 is shorter range, 15000 is moderate, 20000+ syncs farther away but costs performance.",
    },
    "MaxBuildingLimitNum": {
        "label": "Max Buildings Per Player",
        "group": "Performance Limits",
        "help": "Per-player building cap. Example: 0 means unlimited, 5000 is restrictive, 20000 allows much more building but can cost performance.",
    },
    "PhysicsActiveDropItemMaxNum": {
        "label": "Max Physics Items",
        "group": "Performance Limits",
        "help": "Maximum dropped items using physics behavior. Example: 50 is light, 100 is moderate, 300 keeps more physics items active but can cost performance.",
    },
    "RandomizerSeed": {
        "label": "Randomizer Seed",
        "group": "World Rules",
        "help": "Optional seed for Pal spawn randomization. Leave blank for a random seed each time; set a value to reproduce the same randomized layout.",
    },
    "bEnablePlayerToPlayerDamage": {
        "label": "Player vs Player Damage",
        "group": "World Rules",
        "help": "Allows players to deal damage directly to each other. Works alongside PvP Enabled - disable both for a fully cooperative server.",
    },
    "bCharacterRecreateInHardcore": {
        "label": "Allow New Character After Hardcore Death",
        "group": "World Rules",
        "help": "In Hardcore Mode, lets a player create a new character after death instead of being permanently locked out.",
    },
    "bExistPlayerAfterLogout": {
        "label": "Sleep On Logout",
        "group": "Identity and Access",
        "help": "When enabled, a player's character stays in the world asleep at their current location after logging out, instead of disappearing.",
    },
    "bIsShowJoinLeftMessage": {
        "label": "Native Join/Leave Messages",
        "group": "Identity and Access",
        "help": "Palworld's own in-game system message when a player joins or leaves. Separate from AutoPalExpress's own join/leave broadcast option in Automation.",
    },
    "ChatPostLimitPerMinute": {
        "label": "Chat Messages Per Minute",
        "group": "Identity and Access",
        "help": "Maximum chat messages one player can send per minute. Lower values reduce chat spam.",
    },
    "bEnableNonLoginPenalty": {
        "label": "Enable Inactivity Penalty",
        "group": "Identity and Access",
        "help": "Applies a penalty to players who have not logged in for a while.",
    },
    "bAllowGlobalPalboxExport": {
        "label": "Allow Global Palbox Export",
        "group": "Bases and Work",
        "help": "Lets players save a Pal to the shared Global Palbox for use across saves or servers that support importing it.",
    },
    "bAllowGlobalPalboxImport": {
        "label": "Allow Global Palbox Import",
        "group": "Bases and Work",
        "help": "Lets players load a Pal previously saved to the shared Global Palbox.",
    },
    "GuildRejoinCooldownMinutes": {
        "label": "Guild Rejoin Cooldown (minutes)",
        "group": "Identity and Access",
        "help": "Minutes a player must wait before rejoining a guild they recently left.",
    },
    "bAutoResetGuildNoOnlinePlayers": {
        "label": "Auto-Reset Inactive Guilds",
        "group": "Identity and Access",
        "help": "Automatically clears an inactive guild's bases and claims after no member has been online for the time below.",
    },
    "AutoResetGuildTimeNoOnlinePlayers": {
        "label": "Inactive Guild Reset Time (hours)",
        "group": "Identity and Access",
        "help": "Hours with no guild members online before auto-reset triggers, if enabled above.",
    },
    "VoiceChatMaxVolumeDistance": {
        "label": "Voice Chat Full Volume Distance",
        "group": "Identity and Access",
        "help": "Distance at which voice chat reaches full volume. Example: 3000 is Palworld's common default.",
    },
    "VoiceChatZeroVolumeDistance": {
        "label": "Voice Chat Silent Distance",
        "group": "Identity and Access",
        "help": "Distance at which voice chat fades to silent. Example: 15000 is Palworld's common default.",
    },
    "bAllowEnhanceStat_Health": {
        "label": "Allow HP Point Allocation",
        "group": "Progression",
        "help": "Lets players spend status points on Health.",
    },
    "bAllowEnhanceStat_Attack": {
        "label": "Allow Attack Point Allocation",
        "group": "Progression",
        "help": "Lets players spend status points on Attack.",
    },
    "bAllowEnhanceStat_Stamina": {
        "label": "Allow Stamina Point Allocation",
        "group": "Progression",
        "help": "Lets players spend status points on Stamina.",
    },
    "bAllowEnhanceStat_Weight": {
        "label": "Allow Carry Weight Point Allocation",
        "group": "Progression",
        "help": "Lets players spend status points on Carry Weight.",
    },
    "bAllowEnhanceStat_WorkSpeed": {
        "label": "Allow Work Speed Point Allocation",
        "group": "Progression",
        "help": "Lets players spend status points on Work Speed.",
    },
    "DenyTechnologyList": {
        "label": "Disabled Technology IDs",
        "group": "Progression",
        "help": "Comma-separated technology IDs to hide from the tech tree. Leave blank to allow the full tree.",
    },
    "PalAutoHpRegeneRateInSleep": {
        "label": "Pal HP Regen Rate (Resting)",
        "group": "Time and Survival",
        "help": "Pal HP regen multiplier while resting in the Palbox. Example: 0.5 heals slower, 1 is normal, 2 heals twice as fast.",
    },
    "PlayerAutoHpRegeneRateInSleep": {
        "label": "Player HP Regen Rate (Sleeping)",
        "group": "Time and Survival",
        "help": "Player HP regen multiplier while sleeping. Example: 0.5 heals slower, 1 is normal, 2 heals twice as fast.",
    },
    "EquipmentDurabilityDamageRate": {
        "label": "Equipment Durability Loss Rate",
        "group": "Time and Survival",
        "help": "Equipment durability loss multiplier. Example: 0.5 halves durability loss, 1 is normal, 2 wears gear out twice as fast.",
    },
    "BlockRespawnTime": {
        "label": "Respawn Cooldown (seconds)",
        "group": "Time and Survival",
        "help": "Base respawn cooldown in seconds after death.",
    },
    "RespawnPenaltyDurationThreshold": {
        "label": "Quick-Death Threshold (seconds)",
        "group": "Time and Survival",
        "help": "Survival time in seconds below which a short recent life counts toward the repeated-death respawn penalty.",
    },
    "RespawnPenaltyTimeScale": {
        "label": "Respawn Penalty Multiplier",
        "group": "Time and Survival",
        "help": "Multiplier applied to respawn cooldown for repeated quick deaths.",
    },
    "bDisplayPvPItemNumOnWorldMap_BaseCamp": {
        "label": "Show Base PvP Item Count On Map",
        "group": "Combat",
        "help": "Shows a base's PvP-lootable item count on the world map.",
    },
    "bDisplayPvPItemNumOnWorldMap_Player": {
        "label": "Show Player PvP Item Count On Map",
        "group": "Combat",
        "help": "Shows a player's PvP-lootable item count on the world map.",
    },
    "bAdditionalDropItemWhenPlayerKillingInPvPMode": {
        "label": "Extra Item Drop On PvP Kill",
        "group": "Combat",
        "help": "Enables an extra item drop for the killer after a PvP kill, using the item and quantity below.",
    },
    "AdditionalDropItemWhenPlayerKillingInPvPMode": {
        "label": "PvP Kill Drop Item ID",
        "group": "Combat",
        "help": "Item ID dropped as an extra reward for a PvP kill, when enabled above.",
    },
    "AdditionalDropItemNumWhenPlayerKillingInPvPMode": {
        "label": "PvP Kill Drop Item Quantity",
        "group": "Combat",
        "help": "Quantity of the extra PvP-kill drop item, when enabled above.",
    },
    "bInvisibleOtherGuildBaseCampAreaFX": {
        "label": "Hide Other Guilds' Base Area Effect",
        "group": "Bases and Work",
        "help": "Hides the base-boundary visual effect for other guilds' bases.",
    },
    "bBuildAreaLimit": {
        "label": "Restrict Building Near Landmarks",
        "group": "Bases and Work",
        "help": "Restricts building near certain landmarks and points of interest.",
    },
    "bEnableDefenseOtherGuildPlayer": {
        "label": "Base Defenses Target Other Guilds",
        "group": "Bases and Work",
        "help": "Allows base defenses to target players from other guilds.",
    },
    "bCanPickupOtherGuildDeathPenaltyDrop": {
        "label": "Allow Looting Other Guilds' Death Drops",
        "group": "Bases and Work",
        "help": "Allows players to pick up death-penalty item drops left by members of other guilds.",
    },
    "bEnableBuildingPlayerUIdDisplay": {
        "label": "Show Structure Builder",
        "group": "Bases and Work",
        "help": "Shows which player placed a structure when inspecting it.",
    },
    "MonsterFarmActionSpeedRate": {
        "label": "Ranch Action Speed Rate",
        "group": "Bases and Work",
        "help": "Speed multiplier for Pal ranch/farm production actions. Example: 0.5 is slower, 1 is normal, 2 is twice as fast.",
    },
    "ItemCorruptionMultiplier": {
        "label": "Item Corrosion Rate",
        "group": "Time and Survival",
        "help": "Multiplier for how quickly items corrupt or degrade over time, on servers that track item corruption.",
    },
    "EnablePredatorBossPal": {
        "label": "Enable Predator Pals",
        "group": "World Density",
        "help": "Enables Predator (boss-variant) Pal spawns.",
    },
}

LOCAL_API_SETTING_KEYS = {"RESTAPIEnabled", "RESTAPIPort", "LogFormatType"}


def _group_for_key(key: str) -> str:
    if "Damage" in key or "PvP" in key:
        return "Combat"
    if "BaseCamp" in key or "Build" in key or "Work" in key:
        return "Bases and Work"
    if "Drop" in key or "Spawn" in key or "Invader" in key:
        return "World Density"
    if "Rate" in key or "Exp" in key or "Egg" in key or "Technology" in key:
        return "Progression"
    if "Time" in key or "Stamina" in key or "Stomach" in key or "HPRegene" in key:
        return "Time and Survival"
    if "Password" in key or "Player" in key or "Guild" in key or "Server" in key or "VoiceChat" in key:
        return "Identity and Access"
    if "Save" in key or "Backup" in key:
        return "Saving and Backups"
    if "REST" in key or "RCON" in key or "Log" in key:
        return "Local API"
    return "Other"

# Fields with their own dedicated control elsewhere (Super Admin's port
# management, Launcher Options' public IP override) rather than the generic
# World Settings editor, so editing a server's port/IP only ever has the one
# place - hidden from read_all_settings, but write_settings still accepts
# PublicPort, since that dedicated control uses the same write path under the
# hood. PublicIP has no such write path today (Launcher Options passes
# -publicip as a launch argument instead of editing this ini field) - it's
# hidden here purely to avoid a second, inert place to "set the public IP".
_MANAGED_ELSEWHERE = {"PublicPort", "PublicIP", "RCONEnabled", "RCONPort"}


def _tokenize_option_body(body: str) -> list[str]:
    """Splits the flat body of OptionSettings=(...) into individual
    key=value tokens, respecting nested parens/quotes so values like
    CrossplayPlatforms=(Steam,Xbox,PS5,Mac) or a quoted string containing a
    comma don't get split apart."""
    tokens: list[str] = []
    current: list[str] = []
    depth = 0
    in_quotes = False
    for ch in body:
        if ch == '"':
            in_quotes = not in_quotes
            current.append(ch)
        elif not in_quotes and ch in "([":
            depth += 1
            current.append(ch)
        elif not in_quotes and ch in ")]":
            depth -= 1
            current.append(ch)
        elif ch == "," and not in_quotes and depth == 0:
            tokens.append("".join(current))
            current = []
        else:
            current.append(ch)
    if current:
        tokens.append("".join(current))
    return tokens


def parse_option_settings(body: str) -> dict[str, str]:
    """Returns {key: raw_value_string} in file order. Raw values keep their
    original formatting (quotes, parens, etc.) exactly as Palworld wrote
    them, so untouched fields round-trip byte-for-byte."""
    pairs: dict[str, str] = {}
    for token in _tokenize_option_body(body):
        if "=" not in token:
            continue
        key, _, value = token.partition("=")
        pairs[key.strip()] = value
    return pairs


def serialize_option_settings(pairs: dict[str, str]) -> str:
    return ",".join(f"{key}={value}" for key, value in pairs.items())


def infer_field_type(raw_value: str) -> str:
    if raw_value in ("True", "False"):
        return "bool"
    if re.fullmatch(r"-?\d+", raw_value):
        return "int"
    if re.fullmatch(r"-?\d+\.\d+", raw_value):
        return "float"
    if raw_value == "":
        return "string"
    if raw_value.startswith('"') and raw_value.endswith('"'):
        return "string"
    if raw_value.startswith("(") and raw_value.endswith(")"):
        return "raw"
    return "enum"


def _decode_value(raw_value: str, field_type: str) -> Any:
    if field_type == "bool":
        return raw_value == "True"
    if field_type == "int":
        return int(raw_value)
    if field_type == "float":
        return float(raw_value)
    if field_type == "string":
        return raw_value[1:-1] if raw_value.startswith('"') else raw_value
    return raw_value  # enum/raw - edit as the exact original text


def _encode_value(value: Any, field_type: str) -> str:
    if field_type == "bool":
        return "True" if value else "False"
    if field_type == "int":
        return str(int(value))
    if field_type == "float":
        return f"{float(value):.6f}"
    if field_type == "string":
        return f'"{str(value).replace(chr(34), "")}"'
    return str(value)  # enum/raw


def _humanize_key(key: str) -> str:
    name = key[1:] if key.startswith("b") and len(key) > 1 and key[1].isupper() else key
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])", " ", name).strip()


def _read_option_body(server_path: Path) -> str:
    ini_path = _settings_ini_path(server_path)
    if ini_path.is_file():
        text = ini_path.read_text(encoding="utf-8-sig")
    else:
        template_path = _default_template_path(server_path)
        text = template_path.read_text(encoding="utf-8-sig") if template_path.is_file() else ""
    match = _OPTION_LINE_RE.search(text)
    return match.group(1) if match else ""


def read_all_settings(server_path: Path) -> list[dict[str, Any]]:
    """Every field in this server's live PalWorldSettings.ini (or its
    default template if that hasn't been created yet), typed and labeled
    for a UI to render directly - popular fields first, in curated order,
    then everything else in original file order."""
    raw_pairs = parse_option_settings(_read_option_body(server_path))

    fields = []
    for key, raw_value in raw_pairs.items():
        if key in _MANAGED_ELSEWHERE:
            continue
        field_type = infer_field_type(raw_value)
        meta = _POPULAR_META.get(key) or _ADVANCED_META.get(key) or {}
        fields.append(
            {
                "key": key,
                "type": field_type,
                "value": _decode_value(raw_value, field_type),
                "label": meta.get("label") or _humanize_key(key),
                "description": meta.get("description"),
                "help": meta.get("help"),
                "group": meta.get("group") or _group_for_key(key),
                "options": meta.get("options"),
                "sensitive": meta.get("sensitive", False),
                "popular": key in _POPULAR_META,
            }
        )

    file_order = {key: i for i, key in enumerate(raw_pairs)}
    fields.sort(key=lambda f: (0 if f["popular"] else 1, _POPULAR_ORDER.get(f["key"], 0) if f["popular"] else file_order[f["key"]]))
    return fields


def write_settings(server_path: Path, updates: dict[str, Any]) -> None:
    """Applies a partial {key: new_value} update to the live
    PalWorldSettings.ini, preserving every untouched field exactly as-is."""
    ini_path = _settings_ini_path(server_path)
    if ini_path.is_file():
        text = ini_path.read_text(encoding="utf-8-sig")
    else:
        ini_path.parent.mkdir(parents=True, exist_ok=True)
        template_path = _default_template_path(server_path)
        text = (
            template_path.read_text(encoding="utf-8-sig")
            if template_path.is_file()
            else "[/Script/Pal.PalGameWorldSettings]\nOptionSettings=()\n"
        )

    match = _OPTION_LINE_RE.search(text)
    pairs = parse_option_settings(match.group(1) if match else "")

    for key, new_value in updates.items():
        if key not in pairs:
            raise ValueError(f"Unknown setting: {key}")
        field_type = infer_field_type(pairs[key])
        pairs[key] = _encode_value(new_value, field_type)

    new_line = f"OptionSettings=({serialize_option_settings(pairs)})"
    if match:
        text = text[: match.start()] + new_line + text[match.end() :]
    else:
        text = text.rstrip() + "\n" + new_line + "\n"

    ini_path.write_text(text, encoding="utf-8")
