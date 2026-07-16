export type UserRole = "super_admin" | "admin";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: number;
  language: string;
}

export interface AuthStatus {
  needsSetup: boolean;
}

export interface UniversityStep {
  id: string;
  title: string;
  description: string;
  route: string;
  completed: boolean;
  locked: boolean;
}

export interface UniversityCourse {
  id: string;
  title: string;
  shortTitle: string;
  available: boolean;
  active: boolean;
  graduatedAt: number | null;
  requires?: string | null;
  steps: UniversityStep[];
}

export interface UniversityCatalog {
  activeCourse: string | null;
  courses: UniversityCourse[];
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
  help: string | null;
  group: string;
  options: { value: string; label: string; description: string | null }[] | null;
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
  systemCpuPercent: number;
  systemRamUsedGB: number;
  tickRateMs: number | null;
  targetTickRateMs: number;
  playersOnline: number;
  maxPlayers: number;
  serverVersion: string;
  modCount: number;
  lastSavedAt: string;
}

export interface ServerUpdateCheck {
  installedBuildId: string | null;
  latestBuildId: string | null;
  updateAvailable: boolean;
  canCompare: boolean;
}

export type ServerUpdateJobStatus = "running" | "done" | "error";

export interface ServerUpdateJob {
  status: ServerUpdateJobStatus;
  log: string[];
  error: string | null;
  installedBuildId: string | null;
  latestBuildId: string | null;
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
  manuallyInstalled?: boolean;
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

export interface BackupRetentionConfig {
  maxCount: number | null;
  maxAgeDays: number | null;
  maxTotalBytes: number | null;
}

export interface AutomationConfig {
  backup: ScheduleConfig;
  restart: RestartScheduleConfig;
  joinLeaveMessages: boolean;
  backupRetention: BackupRetentionConfig;
  rconReady: boolean;
}

export type BackupKind = "manual" | "scheduled" | "pre_import" | "pre_restore";

export interface BackupRecord {
  timestamp: string;
  kind: BackupKind;
  sizeBytes: number;
  fileCount: number | null;
  liveSaveForced: boolean;
  notes: string;
  hasManifest: boolean;
  folder: string;
}

export type BackupVerifyStatus = "ok" | "corrupted" | "unknown";

export interface BackupVerifyResult {
  status: BackupVerifyStatus;
  issues: string[];
}

export interface BackupRestoreResult {
  restoredFrom: string;
  serverWasStopped: boolean;
  rollbackSnapshot: string | null;
}

export interface SaveImportCandidate {
  path: string;
  name: string;
  sizeBytes: number;
  modified: string;
  valid: boolean;
  issues: string[];
}

export interface SaveImportResult {
  importedFrom: string;
  worldName: string;
  backupCreated: boolean;
}

export type NotificationKind = "success" | "info" | "warning" | "error";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string;
  createdAt: number;
}

export interface AppUpdateStatus {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  releaseName: string | null;
  publishedAt: string | null;
  available: boolean;
}

export interface NexusAccount {
  connected: boolean;
  username?: string;
  userId?: number;
  isPremium?: boolean;
  avatarInitial?: string;
}

export interface NexusSsoStart {
  requestId: string;
  authorizeUrl: string;
}

export type NexusSsoStatus =
  { status: "pending" } | { status: "connected"; account: NexusAccount } | { status: "error"; message: string };

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

export interface NexusModPage {
  results: NexusModResult[];
  totalCount: number;
}

export interface NexusModFile {
  fileId: number;
  name: string;
  version: string;
  category: string;
  isMain: boolean;
  sizeKb?: number | null;
  description: string;
}

export interface ModWishlistRequest {
  id: string;
  nexusModId: number;
  name: string;
  author: string;
  summary: string;
  pictureUrl?: string;
  nexusUrl: string;
  requestedBy: string;
  requestedAt: string;
}

export type ModsPathSource = "override" | "derived" | null;
export type InstanceSource = "steam" | "manual" | "deployed";

export interface ServerInstance {
  id: string;
  name: string;
  serverPath: string;
  source: InstanceSource;
  gamePort: number;
  effectiveGamePort: number;
  queryPort: number;
  rconPort: number;
  communityServer: boolean;
  usePerfThreads: boolean;
  noAsyncLoadingThread: boolean;
  useMultithreadForDs: boolean;
  usePublicIpOverride: boolean;
  usePublicPortOverride: boolean;
  useQueryPort: boolean;
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
  queryPort: number | null;
  adminPort: number;
  gameMapping: PortMappingInfo | null;
  queryMapping: PortMappingInfo | null;
  adminMapping: PortMappingInfo | null;
  gameVerified: boolean;
  queryVerified: boolean;
  adminVerified: boolean;
}

export interface PortForwardResult {
  port: number;
  externalIp: string | null;
  routerName: string;
}
