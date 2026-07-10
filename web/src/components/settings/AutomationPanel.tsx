import * as React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Save, TriangleAlert, HardDriveDownload } from "lucide-react";
import { Link } from "react-router-dom";
import { automationApi } from "@/api";
import type { AutomationConfig, BackupRecord, ScheduleConfig, RestartScheduleConfig } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { GuildTable, type GuildTableColumn } from "@/components/fantasy/GuildTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/hooks/useNotifications";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_DEFAULTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
        <Label htmlFor={`${idPrefix}-frequency`}>{t("settings.automation.frequency", { defaultValue: "Frequency" })}</Label>
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

export function AutomationPanel() {
  const { t } = useTranslation();
  const [config, setConfig] = React.useState<AutomationConfig | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [backups, setBackups] = React.useState<BackupRecord[]>([]);
  const [backingUp, setBackingUp] = React.useState(false);
  const notifications = useNotifications();

  const refreshBackups = React.useCallback(() => {
    automationApi.listBackups().then(setBackups);
  }, []);

  React.useEffect(() => {
    automationApi.getAutomation().then(setConfig);
    refreshBackups();
  }, [refreshBackups]);

  function update(patch: Partial<AutomationConfig>) {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await automationApi.updateAutomation(config);
      setConfig(saved);
      setDirty(false);
      notifications.success({
        title: t("settings.automation.updatedTitle", { defaultValue: "Automation updated" }),
        message: t("settings.automation.updatedMessage", { defaultValue: "Your schedules have been inscribed." }),
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
        message: t("settings.automation.backupCompleteMessage", { defaultValue: "The realm's save data has been preserved." }),
      });
    } catch (e) {
      notifications.error({
        title: t("settings.automation.backupFailedTitle", { defaultValue: "Backup failed" }),
        message: e instanceof Error ? e.message : t("settings.automation.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setBackingUp(false);
    }
  }

  const yes = t("settings.automation.yes", { defaultValue: "Yes" });
  const no = t("settings.automation.no", { defaultValue: "No" });
  const backupColumns: GuildTableColumn<BackupRecord>[] = [
    { key: "timestamp", header: t("settings.automation.when", { defaultValue: "When" }), render: (b) => formatTimestamp(b.timestamp) },
    { key: "sizeBytes", header: t("settings.automation.size", { defaultValue: "Size" }), align: "center", render: (b) => formatBytes(b.sizeBytes) },
    { key: "liveSaveForced", header: t("settings.automation.freshSave", { defaultValue: "Fresh Save" }), align: "right", render: (b) => (b.liveSaveForced ? yes : no) },
  ];

  if (!config) {
    return (
      <ScrollPanel icon={<RefreshCw />} title={t("settings.automation.title", { defaultValue: "Automation" })}>
        <p className="animate-pulse text-sm text-parchment-300/50">{t("settings.automation.loading", { defaultValue: "Reading the ancient tome..." })}</p>
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
                defaultValue: "Restart warnings, fresh-save backups, and player arrival/departure messages need the Palworld REST API.",
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

        <div className="space-y-3 border-b border-stone-700/60 pb-6">
          <EnchantedToggle
            id="backupEnabled"
            checked={config.backup.enabled}
            onCheckedChange={(v) => update({ backup: { ...config.backup, enabled: v } })}
            label={t("settings.automation.scheduledBackups", { defaultValue: "Scheduled Backups" })}
            description={t("settings.automation.scheduledBackupsDescription", { defaultValue: "Automatically archive world saves" })}
          />
          <ScheduleFields
            schedule={config.backup}
            onChange={(next) => update({ backup: next })}
            idPrefix="backup"
          />
        </div>

        <div className="space-y-3 border-b border-stone-700/60 pb-6">
          <EnchantedToggle
            id="restartEnabled"
            checked={config.restart.enabled}
            onCheckedChange={(v) => update({ restart: { ...config.restart, enabled: v } })}
            label={t("settings.automation.scheduledRestarts", { defaultValue: "Scheduled Restarts" })}
            description={t("settings.automation.scheduledRestartsDescription", { defaultValue: "Automatically restart on a schedule" })}
          />
          <ScheduleFields
            schedule={config.restart}
            onChange={(next) => update({ restart: next as RestartScheduleConfig })}
            idPrefix="restart"
          />
          <div className="max-w-[12rem] space-y-1.5">
            <Label htmlFor="warningMinutes">{t("settings.automation.warnPlayers", { defaultValue: "Warn players (minutes before)" })}</Label>
            <Input
              id="warningMinutes"
              type="number"
              min={0}
              value={config.restart.warningMinutes}
              onChange={(e) => update({ restart: { ...config.restart, warningMinutes: Number(e.target.value) } })}
              disabled={!config.restart.enabled}
            />
            <p className="text-[11px] text-parchment-300/40">{t("settings.automation.warnPlayersHint", { defaultValue: "0 = no warning broadcast." })}</p>
          </div>
        </div>

        <EnchantedToggle
          id="joinLeaveMessages"
          checked={config.joinLeaveMessages}
          onCheckedChange={(v) => update({ joinLeaveMessages: v })}
          label={t("settings.automation.announceJoinLeave", { defaultValue: "Announce Arrivals & Departures" })}
          description={t("settings.automation.announceJoinLeaveDescription", { defaultValue: "Broadcast when a player enters or leaves the realm" })}
        />

        <div className="flex justify-end">
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={!dirty || saving}>
            {saving ? t("settings.automation.inscribing", { defaultValue: "Inscribing..." }) : t("settings.automation.save", { defaultValue: "Save Automation" })}
          </RuneButton>
        </div>

        <div className="border-t border-stone-700/60 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-parchment-300/40">{t("settings.automation.recentBackups", { defaultValue: "Recent Backups" })}</p>
            <RuneButton variant="ghost" size="sm" icon={<HardDriveDownload />} onClick={handleBackupNow} disabled={backingUp}>
              {backingUp ? t("settings.automation.preserving", { defaultValue: "Preserving..." }) : t("settings.automation.backupNow", { defaultValue: "Backup Now" })}
            </RuneButton>
          </div>
          {backups.length === 0 ? (
            <p className="text-sm text-parchment-300/40">{t("settings.automation.noBackups", { defaultValue: "No backups yet." })}</p>
          ) : (
            <GuildTable columns={backupColumns} rows={backups} rowKey={(b) => b.timestamp} />
          )}
        </div>
      </div>
    </ScrollPanel>
  );
}
