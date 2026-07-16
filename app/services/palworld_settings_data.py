"""Curated field metadata for the World Settings editor.

Palworld's ~100 OptionSettings fields are read/written generically by
palworld_settings.py (type inferred from formatting, not hardcoded) - this
module only supplies the *labels/groups/help text/dropdown options* for the
fields worth curating, plus the small always-true data tables the generic
engine consults (which keys are managed by dedicated UI elsewhere, which
keys belong to the Local API group). Kept separate from the read/write logic
so the ~100-entry metadata table doesn't drown out the actual engine code.
"""

from typing import Any


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
    "bUseAuth": {
        "label": "Require Steam Authentication",
        "group": "Identity and Access",
        "help": "When enabled, Palworld validates every joining player's Steam identity before letting them connect. Disable this only if you understand the trade-off - for example, to allow a split/virtualized Steam session tool (like Nucleus co-op) to join without being blocked by an AUTH error. Turning it off removes that identity check for every player, not just the one you're trying to let in.",
    },
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
