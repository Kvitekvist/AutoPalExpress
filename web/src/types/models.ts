export type UserRole = "super_admin" | "admin";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: number;
}

export interface AuthStatus {
  needsSetup: boolean;
}

export interface InviteCode {
  code: string;
  createdAt: number;
  usedBy: string | null;
}

export type SettingFieldType = "bool" | "int" | "float" | "string" | "enum" | "raw";

export interface SettingField {
  key: string;
  type: SettingFieldType;
  value: boolean | number | string;
  label: string;
  description: string | null;
  sensitive: boolean;
  popular: boolean;
}

export type ServerRunState = "online" | "offline" | "starting" | "stopping" | "restarting";

export interface ServerStatus {
  state: ServerRunState;
  map: string;
  uptimeSeconds: number;
  cpuPercent: number;
  ramUsedGB: number;
  ramTotalGB: number;
  tickRateMs: number | null;
  targetTickRateMs: number;
  playersOnline: number;
  maxPlayers: number;
  serverVersion: string;
  modCount: number;
  lastSavedAt: string;
}

export type ConnectionStatus = "online" | "idle" | "offline";

export interface Player {
  id: string;
  characterName: string;
  steamId: string;
  level: number;
  guild: string | null;
  pingMs: number;
  onlineSeconds: number;
  connectionStatus: ConnectionStatus;
  joinedAt: string;
  isBanned: boolean;
  avatarSeed: string;
}

export type ModStatus = "enabled" | "disabled" | "broken";

export interface Mod {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  dependencies: string[];
  status: ModStatus;
  loadPriority: number;
  updateAvailable: boolean;
  latestVersion?: string;
  sourceModId?: number | null;
}

export interface VerifiedFileInstall {
  token: string;
  verified: true;
  modName: string;
  author: string;
  version: string;
  sizeBytes: number;
}

export type LogLevel = "info" | "warning" | "error" | "debug";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export interface LogStreams {
  app: string[];
  activity: LogEntry[];
}

export interface ServerSettings {
  serverName: string;
  serverPassword: string;
  maxPlayers: number;
  difficulty: "easy" | "normal" | "hard";
  pvpEnabled: boolean;
  expRate: number;
  dayNightLengthMinutes: number;
}

export interface SystemStartupSettings {
  bootWithWindows: boolean;
  autoStartActiveServer: boolean;
}

export interface ScheduleConfig {
  enabled: boolean;
  frequency: "daily" | "weekly";
  dayOfWeek: number; // 0=Monday..6=Sunday, used only when frequency === "weekly"
  hour: number; // 0-23
}

export interface RestartScheduleConfig extends ScheduleConfig {
  warningMinutes: number;
}

export interface AutomationConfig {
  backup: ScheduleConfig;
  restart: RestartScheduleConfig;
  joinLeaveMessages: boolean;
  rconReady: boolean;
}

export interface BackupRecord {
  timestamp: string;
  sizeBytes: number;
  liveSaveForced: boolean;
}

export type NotificationKind = "success" | "info" | "warning" | "error";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string;
  createdAt: number;
}

export interface NexusAccount {
  connected: boolean;
  username?: string;
  userId?: number;
  isPremium?: boolean;
  avatarInitial?: string;
}

export type NexusModList = "trending" | "latest_added" | "latest_updated";

export interface NexusModResult {
  id: string;
  modId: number;
  name: string;
  author: string;
  summary: string;
  version: string;
  categoryId: number | null;
  categoryName: string;
  downloads: number;
  endorsements: number;
  pictureUrl?: string;
  directDownloadEnabled: boolean;
  nexusUrl: string;
}


export type ModsPathSource = "override" | "derived" | null;
export type InstanceSource = "steam" | "manual" | "deployed";

export interface ServerInstance {
  id: string;
  name: string;
  serverPath: string;
  source: InstanceSource;
  gamePort: number;
  rconPort: number;
  communityServer: boolean;
  performanceFlags: boolean;
  workerThreads: number | null;
  jsonLogFormat: boolean;
  createdAt: number;
  exists: boolean;
  executableFound: boolean;
  modsPath: string | null;
  modsPathSource: ModsPathSource;
  modsPathExists: boolean;
  ue4ssInstalled: boolean;
  ue4ssVersion: string | null;
}

export interface InstanceListView {
  activeId: string | null;
  instances: ServerInstance[];
}

export type DeployJobStatus = "running" | "done" | "error";

export interface DeployJob {
  status: DeployJobStatus;
  log: string[];
  error: string | null;
  instanceId: string | null;
}

export interface ModsPathInfo {
  modsPath: string | null;
  source: ModsPathSource;
  exists: boolean;
}

export interface Ue4ssStatus {
  installed: boolean;
  installedVersion: string | null;
}

export interface Ue4ssLatest {
  version: string;
  assetName: string;
  downloadUrl: string;
  size: number;
}

export interface PortMappingInfo {
  internalClient: string;
  isThisMachine: boolean;
  description: string;
}

export interface UpnpStatus {
  available: boolean;
  routerName: string | null;
  externalIp: string | null;
  localIp: string | null;
  port: number | null;
  adminPort: number;
  gameMapping: PortMappingInfo | null;
  adminMapping: PortMappingInfo | null;
}

export interface PortForwardResult {
  port: number;
  externalIp: string | null;
  routerName: string;
}
