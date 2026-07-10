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
        "description": "Pals are lost forever on death.",
        "help": "A harsh survival mode. Death has permanent consequences and players may not be able to respawn normally.",
    },
    {
        "key": "ExpRate",
        "label": "EXP Rate",
        "group": "Progression",
        "help": "Experience multiplier. Higher levels players faster; lower slows leveling down. 1 is normal.",
    },
    {
        "key": "PalCaptureRate",
        "label": "Capture Rate",
        "group": "Progression",
        "help": "Capture chance multiplier. Higher makes Pals easier to catch; lower makes captures harder. 1 is normal.",
    },
    {
        "key": "PalSpawnNumRate",
        "label": "Pal Spawn Rate",
        "group": "World Density",
        "help": "Pal spawn multiplier. Higher creates more wild Pals and more server load; lower reduces density. 1 is normal.",
    },
    {
        "key": "PalDamageRateAttack",
        "label": "Pal Attack Damage Rate",
        "group": "Combat",
        "help": "Damage dealt by Pals. Higher makes Pals hit harder; lower weakens Pal attacks. 1 is normal.",
    },
    {
        "key": "PalDamageRateDefense",
        "label": "Pal Defense Damage Rate",
        "group": "Combat",
        "help": "Damage taken by Pals. Higher makes Pals more fragile; lower makes them tougher. 1 is normal.",
    },
    {
        "key": "PlayerDamageRateAttack",
        "label": "Player Attack Damage Rate",
        "group": "Combat",
        "help": "Damage dealt by players. Higher makes players hit harder; lower weakens player attacks. 1 is normal.",
    },
    {
        "key": "PlayerDamageRateDefense",
        "label": "Player Defense Damage Rate",
        "group": "Combat",
        "help": "Damage taken by players. Higher makes players more fragile; lower makes them tougher. 1 is normal.",
    },
    {
        "key": "DayTimeSpeedRate",
        "label": "Day Length Rate",
        "group": "Time and Survival",
        "help": "Daytime speed multiplier. Higher makes daytime pass faster; lower makes days last longer. 1 is normal.",
    },
    {
        "key": "NightTimeSpeedRate",
        "label": "Night Length Rate",
        "group": "Time and Survival",
        "help": "Nighttime speed multiplier. Higher makes nights pass faster; lower makes nights last longer. 1 is normal.",
    },
    {
        "key": "WorkSpeedRate",
        "label": "Work Speed Rate",
        "group": "Bases and Work",
        "help": "Work speed multiplier. Higher speeds crafting/base work; lower slows production. 1 is normal.",
    },
    {
        "key": "DropItemMaxNum",
        "label": "Max Dropped Items",
        "group": "Performance Limits",
        "help": "Maximum dropped items in the world. Higher preserves more drops but can hurt performance; lower cleans up sooner.",
    },
    {
        "key": "BaseCampMaxNum",
        "label": "Max Base Camps",
        "group": "Bases and Work",
        "help": "Total bases allowed on the server. Higher supports more building but increases server load.",
    },
    {
        "key": "BaseCampWorkerMaxNum",
        "label": "Max Workers Per Base",
        "group": "Bases and Work",
        "help": "Maximum Pals assigned to one base. Higher allows busier bases but increases processing load.",
    },
    {
        "key": "GuildPlayerMaxNum",
        "label": "Max Guild Size",
        "group": "Identity and Access",
        "help": "Maximum players in a guild. Higher allows larger shared groups.",
    },
    {
        "key": "AutoSaveSpan",
        "label": "Auto-Save Interval (minutes)",
        "group": "Saving and Backups",
        "help": "Minutes between automatic saves. Lower saves more often but can add disk activity; higher reduces disk load but risks more rollback after a crash.",
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
        "group": "Progression",
        "help": "Gathered item amount multiplier. Higher gives more resources; lower makes gathering slower. 1 is normal.",
    },
    "CollectionObjectHpRate": {
        "group": "Progression",
        "help": "Health of gatherable objects. Higher means nodes take longer to break; lower makes harvesting faster. 1 is normal.",
    },
    "CollectionObjectRespawnSpeedRate": {
        "group": "Progression",
        "help": "Gatherable respawn speed. Higher usually means faster respawns; lower spaces resource returns out more.",
    },
    "EnemyDropItemRate": {
        "group": "Progression",
        "help": "Enemy drop quantity multiplier. Higher gives more loot; lower gives less. 1 is normal.",
    },
    "PalEggDefaultHatchingTime": {
        "group": "Progression",
        "help": "Huge Egg hatch time in hours. Higher makes eggs take longer; lower speeds incubation.",
    },
    "SupplyDropSpan": {
        "group": "World Density",
        "help": "Minutes between meteorite or supply-drop events. Higher means less frequent events; lower means more frequent events.",
    },
    "BuildObjectDamageRate": {
        "group": "Combat",
        "help": "Damage dealt to buildings. Higher makes structures break faster; lower makes them tougher.",
    },
    "BuildObjectDeteriorationDamageRate": {
        "group": "Bases and Work",
        "help": "Building decay speed. Higher decays structures faster; lower slows decay.",
    },
    "ItemWeightRate": {
        "group": "Time and Survival",
        "help": "Item weight multiplier. Higher makes items heavier; lower makes carrying easier.",
    },
    "PlayerStaminaDecreaceRate": {
        "label": "Player Stamina Drain Rate",
        "group": "Time and Survival",
        "help": "Player stamina drain multiplier. Higher drains faster; lower drains slower.",
    },
    "PalStaminaDecreaceRate": {
        "label": "Pal Stamina Drain Rate",
        "group": "Time and Survival",
        "help": "Pal stamina drain multiplier. Higher drains faster; lower drains slower.",
    },
    "PlayerStomachDecreaceRate": {
        "label": "Player Hunger Drain Rate",
        "group": "Time and Survival",
        "help": "Player hunger drain multiplier. Higher makes hunger fall faster; lower makes food last longer.",
    },
    "PalStomachDecreaceRate": {
        "label": "Pal Hunger Drain Rate",
        "group": "Time and Survival",
        "help": "Pal hunger drain multiplier. Higher makes hunger fall faster; lower makes food last longer.",
    },
    "PlayerAutoHPRegeneRate": {
        "label": "Player HP Regen Rate",
        "group": "Time and Survival",
        "help": "Player natural HP regeneration multiplier. Higher heals faster; lower heals slower.",
    },
    "PalAutoHPRegeneRate": {
        "label": "Pal HP Regen Rate",
        "group": "Time and Survival",
        "help": "Pal natural HP regeneration multiplier. Higher heals faster; lower heals slower.",
    },
    "ServerReplicatePawnCullDistance": {
        "group": "Performance Limits",
        "help": "Distance in centimeters for syncing Pals to players. Higher can improve visibility at range but costs performance.",
    },
    "MaxBuildingLimitNum": {
        "group": "Performance Limits",
        "help": "Per-player building cap. 0 means unlimited. Higher allows more structures but can cost performance.",
    },
    "PhysicsActiveDropItemMaxNum": {
        "group": "Performance Limits",
        "help": "Maximum dropped items using physics behavior. Higher looks more physical but can cost performance.",
    },
}


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
# management) rather than the generic World Settings editor, so editing a
# server's port only ever has the one place - hidden from read_all_settings,
# but write_settings still accepts it, since that dedicated control uses the
# same write path under the hood.
_MANAGED_ELSEWHERE = {"PublicPort", "RCONEnabled", "RCONPort"}


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
