import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshCw,
  Save,
  TriangleAlert,
  HardDriveDownload,
  FolderOpen,
  ShieldCheck,
  History,
  Download,
  CircleCheck,
  CircleX,
  CircleHelp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { automationApi } from "@/api";
import type {
  AutomationConfig,
  BackupRecord,
  BackupVerifyResult,
  ScheduleConfig,
  RestartScheduleConfig,
} from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { GuildTable, type GuildTableColumn } from "@/components/fantasy/GuildTable";
import { QuestSpotlight } from "@/components/university/QuestSpotlight";
import { completeQuestStep } from "@/lib/questCompletion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/hooks/useNotifications";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_DEFAULTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const KIND_LABELS: Record<string, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  pre_import: "Pre-Import",
  pre_restore: "Pre-Restore",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(timestamp: string): string {
  // Backend format: "2026-07-05_20-43-46"
  const [datePart, timePart] = timestamp.split("_");
  return `${datePart} ${timePart?.replace(/-/g, ":") ?? ""}`;
}

function ScheduleFields({
  schedule,
  onChange,
  idPrefix,
}: {
  schedule: ScheduleConfig;
  onChange: (next: ScheduleConfig) => void;
  idPrefix: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-frequency`}>
          {t("settings.automation.frequency", { defaultValue: "Frequency" })}
        </Label>
        <Select
          value={schedule.frequency}
          onValueChange={(v) => onChange({ ...schedule, frequency: v as "daily" | "weekly" })}
          disabled={!schedule.enabled}
        >
          <SelectTrigger id={`${idPrefix}-frequency`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{t("settings.automation.daily", { defaultValue: "Daily" })}</SelectItem>
            <SelectItem value="weekly">{t("settings.automation.weekly", { defaultValue: "Weekly" })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {schedule.frequency === "weekly" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-day`}>{t("settings.automation.day", { defaultValue: "Day" })}</Label>
          <Select
            value={String(schedule.dayOfWeek)}
            onValueChange={(v) => onChange({ ...schedule, dayOfWeek: Number(v) })}
            disabled={!schedule.enabled}
          >
            <SelectTrigger id={`${idPrefix}-day`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day, i) => (
                <SelectItem key={day} value={String(i)}>
                  {t(`settings.automation.days.${day}`, { defaultValue: DAY_DEFAULTS[i] })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-hour`}>{t("settings.automation.hour", { defaultValue: "Hour" })}</Label>
        <Select
          value={String(schedule.hour)}
          onValueChange={(v) => onChange({ ...schedule, hour: Number(v) })}
          disabled={!schedule.enabled}
        >
          <SelectTrigger id={`${idPrefix}-hour`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, h) => (
              <SelectItem key={h} value={String(h)}>
                {String(h).padStart(2, "0")}:00
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function IntegrityBadge({ result, checking }: { result?: BackupVerifyResult; checking: boolean }) {
  const { t } = useTranslation();
  if (checking) {
    return (
      <span className="text-[11px] text-parchment-300/40">
        {t("settings.automation.verifying", { defaultValue: "Checking..." })}
      </span>
    );
  }
  if (!result) {
    return (
      <span className="text-[11px] text-parchment-300/30">
        {t("settings.automation.notVerified", { defaultValue: "Not checked" })}
      </span>
    );
  }
  if (result.status === "ok") {
    return (
      <span className="flex items-center justify-center gap-1 text-[11px] text-life-400">
        <CircleCheck className="h-3.5 w-3.5" /> {t("settings.automation.verifyOk", { defaultValue: "OK" })}
      </span>
    );
  }
  if (result.status === "corrupted") {
    return (
      <span
        className="flex items-center justify-center gap-1 text-[11px] text-blood-400"
        title={result.issues.join("; ")}
      >
        <CircleX className="h-3.5 w-3.5" /> {t("settings.automation.verifyCorrupted", { defaultValue: "Corrupted" })}
      </span>
    );
  }
  return (
    <span
      className="flex items-center justify-center gap-1 text-[11px] text-parchment-300/40"
      title={result.issues.join("; ")}
    >
      <CircleHelp className="h-3.5 w-3.5" /> {t("settings.automation.verifyUnknown", { defaultValue: "Unknown" })}
    </span>
  );
}

export function AutomationPanel() {
  const { t } = useTranslation();
  const [config, setConfig] = React.useState<AutomationConfig | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [backups, setBackups] = React.useState<BackupRecord[]>([]);
  const [backingUp, setBackingUp] = React.useState(false);
  const [openingFolder, setOpeningFolder] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState<string | null>(null);
  const [verifyResults, setVerifyResults] = React.useState<Record<string, BackupVerifyResult>>({});
  const [restoring, setRestoring] = React.useState(false);
  const [restoreTarget, setRestoreTarget] = React.useState<BackupRecord | null>(null);
  const [notesDraft, setNotesDraft] = React.useState<Record<string, string>>({});
  const notifications = useNotifications();

  const refreshBackups = React.useCallback(() => {
    automationApi.listBackups().then((list) => {
      setBackups(list);
      setNotesDraft(Object.fromEntries(list.map((b) => [b.timestamp, b.notes])));
    });
  }, []);

  React.useEffect(() => {
    automationApi.getAutomation().then(setConfig);
    refreshBackups();
  }, [refreshBackups]);

  function update(patch: Partial<AutomationConfig>) {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }

  function updateRetention(patch: Partial<AutomationConfig["backupRetention"]>) {
    setConfig((prev) => (prev ? { ...prev, backupRetention: { ...prev.backupRetention, ...patch } } : prev));
    setDirty(true);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await automationApi.updateAutomation(config);
      setConfig(saved);
      setDirty(false);
      if (saved.backup.enabled) {
        completeQuestStep("setup_backup");
      }
      notifications.success({
        title: t("settings.automation.updatedTitle", { defaultValue: "Automation updated" }),
        message: t("settings.automation.updatedMessage", { defaultValue: "Your schedules have been inscribed." }),
      });
    } catch (e) {
      notifications.error({
        title: t("settings.automation.updateFailedTitle", { defaultValue: "Could not save" }),
        message:
          e instanceof Error ? e.message : t("settings.automation.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleBackupNow() {
    setBackingUp(true);
    try {
      await automationApi.runBackupNow();
      refreshBackups();
      notifications.success({
        title: t("settings.automation.backupCompleteTitle", { defaultValue: "Backup complete" }),
        message: t("settings.automation.backupCompleteMessage", {
          defaultValue: "The realm's save data has been preserved.",
        }),
      });
    } catch (e) {
      notifications.error({
        title: t("settings.automation.backupFailedTitle", { defaultValue: "Backup failed" }),
        message:
          e instanceof Error ? e.message : t("settings.automation.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setBackingUp(false);
    }
  }

  async function handleOpenBackupFolder(b: BackupRecord) {
    setOpeningFolder(b.timestamp);
    try {
      await automationApi.openBackupFolder(b.timestamp);
    } catch (e) {
      notifications.error({
        title: t("settings.automation.openFolderFailedTitle", { defaultValue: "Could not open folder" }),
        message:
          e instanceof Error ? e.message : t("settings.automation.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setOpeningFolder(null);
    }
  }

  async function handleVerify(b: BackupRecord) {
    setVerifying(b.timestamp);
    try {
      const result = await automationApi.verifyBackup(b.timestamp);
      setVerifyResults((prev) => ({ ...prev, [b.timestamp]: result }));
    } catch (e) {
      notifications.error({
        title: t("settings.automation.verifyFailedTitle", { defaultValue: "Could not verify backup" }),
        message:
          e instanceof Error ? e.message : t("settings.automation.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setVerifying(null);
    }
  }

  function handleExport(b: BackupRecord) {
    window.open(automationApi.backupExportUrl(b.timestamp), "_blank");
  }

  async function handleNotesBlur(b: BackupRecord) {
    const draft = notesDraft[b.timestamp] ?? "";
    if (draft === b.notes) return;
    try {
      const updated = await automationApi.setBackupNotes(b.timestamp, draft);
      setBackups((prev) => prev.map((x) => (x.timestamp === b.timestamp ? updated : x)));
    } catch (e) {
      notifications.error({
        title: t("settings.automation.notesFailedTitle", { defaultValue: "Could not save note" }),
        message:
          e instanceof Error ? e.message : t("settings.automation.unknownError", { defaultValue: "Unknown error." }),
      });
      setNotesDraft((prev) => ({ ...prev, [b.timestamp]: b.notes }));
    }
  }

  async function handleRestoreConfirm() {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const result = await automationApi.restoreBackup(restoreTarget.timestamp);
      refreshBackups();
      setRestoreTarget(null);
      notifications.success({
        title: t("settings.automation.restoredTitle", { defaultValue: "Backup restored" }),
        message: result.serverWasStopped
          ? t("settings.automation.restoredWithStopMessage", {
              defaultValue: "The server was stopped and its save replaced with the {{when}} backup.",
              when: formatTimestamp(restoreTarget.timestamp),
            })
          : t("settings.automation.restoredMessage", {
              defaultValue: "The save was replaced with the {{when}} backup.",
              when: formatTimestamp(restoreTarget.timestamp),
            }),
      });
    } catch (e) {
      notifications.error({
        title: t("settings.automation.restoreFailedTitle", { defaultValue: "Restore failed" }),
        message:
          e instanceof Error ? e.message : t("settings.automation.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setRestoring(false);
    }
  }

  const yes = t("settings.automation.yes", { defaultValue: "Yes" });
  const no = t("settings.automation.no", { defaultValue: "No" });
  const backupColumns: GuildTableColumn<BackupRecord>[] = [
    {
      key: "timestamp",
      header: t("settings.automation.when", { defaultValue: "When" }),
      render: (b) => formatTimestamp(b.timestamp),
    },
    {
      key: "kind",
      header: t("settings.automation.kind", { defaultValue: "Kind" }),
      align: "center",
      render: (b) => KIND_LABELS[b.kind] ?? b.kind,
    },
    {
      key: "sizeBytes",
      header: t("settings.automation.size", { defaultValue: "Size" }),
      align: "center",
      render: (b) => formatBytes(b.sizeBytes),
    },
    {
      key: "liveSaveForced",
      header: t("settings.automation.freshSave", { defaultValue: "Fresh Save" }),
      align: "center",
      render: (b) => (b.liveSaveForced ? yes : no),
    },
    {
      key: "notes",
      header: t("settings.automation.notes", { defaultValue: "Notes" }),
      render: (b) => (
        <Input
          value={notesDraft[b.timestamp] ?? ""}
          onChange={(e) => setNotesDraft((prev) => ({ ...prev, [b.timestamp]: e.target.value }))}
          onBlur={() => handleNotesBlur(b)}
          placeholder={t("settings.automation.notesPlaceholder", { defaultValue: "Add a note..." })}
          className="h-8 min-w-[10rem] text-xs"
        />
      ),
    },
    {
      key: "integrity",
      header: t("settings.automation.integrity", { defaultValue: "Integrity" }),
      align: "center",
      render: (b) => (
        <div className="flex flex-col items-center gap-1">
          <IntegrityBadge result={verifyResults[b.timestamp]} checking={verifying === b.timestamp} />
          <RuneButton
            type="button"
            variant="ghost"
            size="sm"
            icon={<ShieldCheck />}
            onClick={() => handleVerify(b)}
            disabled={verifying === b.timestamp}
            className="h-7 px-2 text-[11px]"
          >
            {t("settings.automation.verify", { defaultValue: "Verify" })}
          </RuneButton>
        </div>
      ),
    },
    {
      key: "actions",
      header: t("settings.automation.actions", { defaultValue: "Actions" }),
      align: "right",
      render: (b) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <RuneButton
            type="button"
            variant="ghost"
            size="sm"
            icon={<FolderOpen />}
            onClick={() => handleOpenBackupFolder(b)}
            disabled={openingFolder === b.timestamp}
          >
            {openingFolder === b.timestamp
              ? t("settings.automation.opening", { defaultValue: "Opening..." })
              : t("settings.automation.openFolder", { defaultValue: "Open Folder" })}
          </RuneButton>
          <RuneButton type="button" variant="ghost" size="sm" icon={<Download />} onClick={() => handleExport(b)}>
            {t("settings.automation.export", { defaultValue: "Export" })}
          </RuneButton>
          <RuneButton type="button" variant="mana" size="sm" icon={<History />} onClick={() => setRestoreTarget(b)}>
            {t("settings.automation.restore", { defaultValue: "Restore" })}
          </RuneButton>
        </div>
      ),
    },
  ];

  if (!config) {
    return (
      <ScrollPanel icon={<RefreshCw />} title={t("settings.automation.title", { defaultValue: "Automation" })}>
        <p className="animate-pulse text-sm text-parchment-300/50">
          {t("settings.automation.loading", { defaultValue: "Reading the ancient tome..." })}
        </p>
      </ScrollPanel>
    );
  }

  return (
    <ScrollPanel icon={<RefreshCw />} title={t("settings.automation.title", { defaultValue: "Automation" })}>
      <div className="space-y-6">
        {!config.rconReady && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-gold-600/30 bg-gold-500/5 px-4 py-3 text-xs text-gold-300">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span>
              {t("settings.automation.restApiNeeded", {
                defaultValue:
                  "Restart warnings, fresh-save backups, and player arrival/departure messages need the Palworld REST API.",
              })}
            </span>
            <Link
              to="/world-settings"
              className="ml-auto shrink-0 font-semibold underline decoration-dotted underline-offset-2 hover:text-gold-200"
            >
              {t("settings.automation.enableRestApi", { defaultValue: "Enable REST API in Super Admin" })}
            </Link>
          </div>
        )}

        <QuestSpotlight stepId="setup_backup" className="space-y-3 border-b border-stone-700/60 pb-6">
          <EnchantedToggle
            id="backupEnabled"
            checked={config.backup.enabled}
            onCheckedChange={(v) => update({ backup: { ...config.backup, enabled: v } })}
            label={t("settings.automation.scheduledBackups", { defaultValue: "Scheduled Backups" })}
            description={t("settings.automation.scheduledBackupsDescription", {
              defaultValue: "Automatically archive world saves",
            })}
          />
          <ScheduleFields schedule={config.backup} onChange={(next) => update({ backup: next })} idPrefix="backup" />
        </QuestSpotlight>

        <div className="space-y-3 border-b border-stone-700/60 pb-6">
          <EnchantedToggle
            id="restartEnabled"
            checked={config.restart.enabled}
            onCheckedChange={(v) => update({ restart: { ...config.restart, enabled: v } })}
            label={t("settings.automation.scheduledRestarts", { defaultValue: "Scheduled Restarts" })}
            description={t("settings.automation.scheduledRestartsDescription", {
              defaultValue: "Automatically restart on a schedule",
            })}
          />
          <ScheduleFields
            schedule={config.restart}
            onChange={(next) => update({ restart: next as RestartScheduleConfig })}
            idPrefix="restart"
          />
          <div className="max-w-[12rem] space-y-1.5">
            <Label htmlFor="warningMinutes">
              {t("settings.automation.warnPlayers", { defaultValue: "Warn players (minutes before)" })}
            </Label>
            <Input
              id="warningMinutes"
              type="number"
              min={0}
              value={config.restart.warningMinutes}
              onChange={(e) => update({ restart: { ...config.restart, warningMinutes: Number(e.target.value) } })}
              disabled={!config.restart.enabled}
            />
            <p className="text-[11px] text-parchment-300/40">
              {t("settings.automation.warnPlayersHint", { defaultValue: "0 = no warning broadcast." })}
            </p>
          </div>
        </div>

        <EnchantedToggle
          id="joinLeaveMessages"
          checked={config.joinLeaveMessages}
          onCheckedChange={(v) => update({ joinLeaveMessages: v })}
          label={t("settings.automation.announceJoinLeave", { defaultValue: "Announce Arrivals & Departures" })}
          description={t("settings.automation.announceJoinLeaveDescription", {
            defaultValue: "Broadcast when a player enters or leaves the realm",
          })}
        />

        <div className="space-y-3 border-t border-stone-700/60 pt-6">
          <Label>{t("settings.automation.retentionTitle", { defaultValue: "Backup Retention" })}</Label>
          <p className="text-[11px] text-parchment-300/40">
            {t("settings.automation.retentionHint", {
              defaultValue: "Leave a field blank for no limit on that dimension. Oldest backups are removed first.",
            })}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="retentionMaxCount">
                {t("settings.automation.retentionMaxCount", { defaultValue: "Keep at most (count)" })}
              </Label>
              <Input
                id="retentionMaxCount"
                type="number"
                min={1}
                value={config.backupRetention.maxCount ?? ""}
                onChange={(e) => updateRetention({ maxCount: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder={t("settings.automation.unlimited", { defaultValue: "Unlimited" })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retentionMaxAge">
                {t("settings.automation.retentionMaxAge", { defaultValue: "Max age (days)" })}
              </Label>
              <Input
                id="retentionMaxAge"
                type="number"
                min={1}
                value={config.backupRetention.maxAgeDays ?? ""}
                onChange={(e) => updateRetention({ maxAgeDays: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder={t("settings.automation.unlimited", { defaultValue: "Unlimited" })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retentionMaxSize">
                {t("settings.automation.retentionMaxSize", { defaultValue: "Max total size (MB)" })}
              </Label>
              <Input
                id="retentionMaxSize"
                type="number"
                min={1}
                value={
                  config.backupRetention.maxTotalBytes
                    ? Math.round(config.backupRetention.maxTotalBytes / (1024 * 1024))
                    : ""
                }
                onChange={(e) =>
                  updateRetention({
                    maxTotalBytes: e.target.value === "" ? null : Number(e.target.value) * 1024 * 1024,
                  })
                }
                placeholder={t("settings.automation.unlimited", { defaultValue: "Unlimited" })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={!dirty || saving}>
            {saving
              ? t("settings.automation.inscribing", { defaultValue: "Inscribing..." })
              : t("settings.automation.save", { defaultValue: "Save Automation" })}
          </RuneButton>
        </div>

        <div className="border-t border-stone-700/60 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-parchment-300/40">
              {t("settings.automation.recentBackups", { defaultValue: "Recent Backups" })}
            </p>
            <RuneButton
              variant="ghost"
              size="sm"
              icon={<HardDriveDownload />}
              onClick={handleBackupNow}
              disabled={backingUp}
            >
              {backingUp
                ? t("settings.automation.preserving", { defaultValue: "Preserving..." })
                : t("settings.automation.backupNow", { defaultValue: "Backup Now" })}
            </RuneButton>
          </div>
          {backups.length === 0 ? (
            <p className="text-sm text-parchment-300/40">
              {t("settings.automation.noBackups", { defaultValue: "No backups yet." })}
            </p>
          ) : (
            <GuildTable columns={backupColumns} rows={backups} rowKey={(b) => b.timestamp} />
          )}
        </div>
      </div>

      <RuneDialog
        open={!!restoreTarget}
        onOpenChange={(o) => !o && setRestoreTarget(null)}
        tone="danger"
        title={t("settings.automation.restoreDialogTitle", { defaultValue: "Restore this backup?" })}
        description={
          restoreTarget &&
          t("settings.automation.restoreDialogDescription", {
            defaultValue:
              "This replaces the server's current save with the {{when}} backup. If the server is running, it will be stopped first. Your current save is snapshotted automatically before restoring, so this can be undone.",
            when: formatTimestamp(restoreTarget.timestamp),
          })
        }
        confirmLabel={t("settings.automation.restoreConfirm", { defaultValue: "Restore" })}
        onConfirm={handleRestoreConfirm}
        confirming={restoring}
      />
    </ScrollPanel>
  );
}
