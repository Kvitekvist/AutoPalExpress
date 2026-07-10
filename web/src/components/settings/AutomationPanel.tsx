import * as React from "react";
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-frequency`}>Frequency</Label>
        <Select
          value={schedule.frequency}
          onValueChange={(v) => onChange({ ...schedule, frequency: v as "daily" | "weekly" })}
          disabled={!schedule.enabled}
        >
          <SelectTrigger id={`${idPrefix}-frequency`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {schedule.frequency === "weekly" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-day`}>Day</Label>
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
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-hour`}>Hour</Label>
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
      notifications.success({ title: "Automation updated", message: "Your schedules have been inscribed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleBackupNow() {
    setBackingUp(true);
    try {
      await automationApi.runBackupNow();
      refreshBackups();
      notifications.success({ title: "Backup complete", message: "The realm's save data has been preserved." });
    } catch (e) {
      notifications.error({ title: "Backup failed", message: e instanceof Error ? e.message : "Unknown error." });
    } finally {
      setBackingUp(false);
    }
  }

  const backupColumns: GuildTableColumn<BackupRecord>[] = [
    { key: "timestamp", header: "When", render: (b) => formatTimestamp(b.timestamp) },
    { key: "sizeBytes", header: "Size", align: "center", render: (b) => formatBytes(b.sizeBytes) },
    { key: "liveSaveForced", header: "Fresh Save", align: "right", render: (b) => (b.liveSaveForced ? "Yes" : "No") },
  ];

  if (!config) {
    return (
      <ScrollPanel icon={<RefreshCw />} title="Automation">
        <p className="animate-pulse text-sm text-parchment-300/50">Reading the ancient tome...</p>
      </ScrollPanel>
    );
  }

  return (
    <ScrollPanel icon={<RefreshCw />} title="Automation">
      <div className="space-y-6">
        {!config.rconReady && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-gold-600/30 bg-gold-500/5 px-4 py-3 text-xs text-gold-300">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span>
              Restart warnings, fresh-save backups, and player arrival/departure messages need the Palworld REST API.
            </span>
            <Link
              to="/world-settings"
              className="ml-auto shrink-0 font-semibold underline decoration-dotted underline-offset-2 hover:text-gold-200"
            >
              Enable REST API in Super Admin
            </Link>
          </div>
        )}

        <div className="space-y-3 border-b border-stone-700/60 pb-6">
          <EnchantedToggle
            id="backupEnabled"
            checked={config.backup.enabled}
            onCheckedChange={(v) => update({ backup: { ...config.backup, enabled: v } })}
            label="Scheduled Backups"
            description="Automatically archive world saves"
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
            label="Scheduled Restarts"
            description="Automatically restart on a schedule"
          />
          <ScheduleFields
            schedule={config.restart}
            onChange={(next) => update({ restart: next as RestartScheduleConfig })}
            idPrefix="restart"
          />
          <div className="max-w-[12rem] space-y-1.5">
            <Label htmlFor="warningMinutes">Warn players (minutes before)</Label>
            <Input
              id="warningMinutes"
              type="number"
              min={0}
              value={config.restart.warningMinutes}
              onChange={(e) => update({ restart: { ...config.restart, warningMinutes: Number(e.target.value) } })}
              disabled={!config.restart.enabled}
            />
            <p className="text-[11px] text-parchment-300/40">0 = no warning broadcast.</p>
          </div>
        </div>

        <EnchantedToggle
          id="joinLeaveMessages"
          checked={config.joinLeaveMessages}
          onCheckedChange={(v) => update({ joinLeaveMessages: v })}
          label="Announce Arrivals & Departures"
          description="Broadcast when a player enters or leaves the realm"
        />

        <div className="flex justify-end">
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Inscribing..." : "Save Automation"}
          </RuneButton>
        </div>

        <div className="border-t border-stone-700/60 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-parchment-300/40">Recent Backups</p>
            <RuneButton variant="ghost" size="sm" icon={<HardDriveDownload />} onClick={handleBackupNow} disabled={backingUp}>
              {backingUp ? "Preserving..." : "Backup Now"}
            </RuneButton>
          </div>
          {backups.length === 0 ? (
            <p className="text-sm text-parchment-300/40">No backups yet.</p>
          ) : (
            <GuildTable columns={backupColumns} rows={backups} rowKey={(b) => b.timestamp} />
          )}
        </div>
      </div>
    </ScrollPanel>
  );
}
