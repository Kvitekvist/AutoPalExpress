import * as React from "react";
import { Sparkles, Sliders, Save, Rocket } from "lucide-react";
import { instancesApi, serverSettingsApi } from "@/api";
import type { ServerInstance, SettingField } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

type FieldValue = boolean | number | string;

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: SettingField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  if (field.type === "bool") {
    return (
      <EnchantedToggle
        id={`field-${field.key}`}
        checked={Boolean(value)}
        onCheckedChange={onChange}
        label={field.label}
        description={field.description ?? undefined}
      />
    );
  }

  const inputType = field.type === "int" || field.type === "float" ? "number" : field.sensitive ? "password" : "text";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
      <Input
        id={`field-${field.key}`}
        type={inputType}
        step={field.type === "float" ? "0.01" : undefined}
        value={value as string | number}
        onChange={(e) => {
          if (field.type === "int") onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10));
          else if (field.type === "float") onChange(e.target.value === "" ? 0 : parseFloat(e.target.value));
          else onChange(e.target.value);
        }}
      />
      {field.description && <p className="text-xs text-parchment-300/40">{field.description}</p>}
    </div>
  );
}

export default function WorldSettings() {
  const [fields, setFields] = React.useState<SettingField[] | null>(null);
  const [activeInstance, setActiveInstance] = React.useState<ServerInstance | null>(null);
  const [values, setValues] = React.useState<Record<string, FieldValue>>({});
  const [dirty, setDirty] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [savingLaunch, setSavingLaunch] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const notifications = useNotifications();
  const { user } = useAuth();
  const canEditLaunchOptions = user.role === "super_admin";

  const load = React.useCallback(() => {
    serverSettingsApi.getSettings().then((data) => {
      setFields(data.fields);
      setValues(Object.fromEntries(data.fields.map((f) => [f.key, f.value])));
      setDirty(new Set());
    });
    instancesApi.getActive().then(setActiveInstance);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function updateValue(key: string, value: FieldValue) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => new Set(prev).add(key));
  }

  async function handleSave() {
    if (dirty.size === 0) return;
    setSaving(true);
    try {
      const updates = Object.fromEntries([...dirty].map((key) => [key, values[key]]));
      const data = await serverSettingsApi.updateSettings(updates);
      setFields(data.fields);
      setValues(Object.fromEntries(data.fields.map((f) => [f.key, f.value])));
      setDirty(new Set());
      notifications.success({
        title: "Settings saved",
        message: "Changes take effect the next time the server starts.",
      });
    } catch (e) {
      notifications.error({ title: "Couldn't save", message: e instanceof Error ? e.message : "Unknown error." });
    } finally {
      setSaving(false);
    }
  }

  async function saveLaunchOptions(
    nextOptions: Partial<Pick<ServerInstance, "performanceFlags" | "workerThreads" | "jsonLogFormat">>
  ) {
    if (!activeInstance || !canEditLaunchOptions) return;
    setSavingLaunch(true);
    try {
      const next = await instancesApi.setLaunchOptions(activeInstance.id, {
        performanceFlags:
          "performanceFlags" in nextOptions ? Boolean(nextOptions.performanceFlags) : activeInstance.performanceFlags,
        workerThreads: "workerThreads" in nextOptions ? nextOptions.workerThreads ?? null : activeInstance.workerThreads,
        jsonLogFormat: "jsonLogFormat" in nextOptions ? Boolean(nextOptions.jsonLogFormat) : activeInstance.jsonLogFormat,
      });
      setActiveInstance(next.instances.find((instance) => instance.id === activeInstance.id) ?? null);
      notifications.success({
        title: "Launch options saved",
        message: "Restart the server for these launch options to take effect.",
      });
    } catch (e) {
      notifications.error({ title: "Couldn't save", message: e instanceof Error ? e.message : "Unknown error." });
    } finally {
      setSavingLaunch(false);
    }
  }

  if (!fields) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="animate-pulse font-display">Unrolling the ancient scroll...</p>
      </div>
    );
  }

  const popular = fields.filter((f) => f.popular);
  const advanced = fields.filter((f) => !f.popular);

  return (
    <div className="space-y-6 pb-24">
      <ScrollPanel icon={<Sparkles />} title="Popular Settings">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {popular.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => updateValue(field.key, v)}
            />
          ))}
        </div>
      </ScrollPanel>

      {activeInstance && (
        <ScrollPanel icon={<Rocket />} title="Launch Options">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <EnchantedToggle
              id="launch-performance-flags"
              checked={activeInstance.performanceFlags}
              disabled={savingLaunch || !canEditLaunchOptions}
              onCheckedChange={(checked) => saveLaunchOptions({ performanceFlags: checked })}
              label="Performance launch flags"
              description="Uses Palworld's multi-threaded server startup arguments."
            />
            <div className="rounded-md border border-stone-700 bg-abyss-900/40 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label htmlFor="launch-worker-threads" className="normal-case text-sm font-medium text-parchment-100 tracking-normal">
                    Worker thread override
                  </Label>
                  <p className="mt-0.5 text-xs text-parchment-300/60">
                    Adds a specific process thread count when performance flags are on.
                  </p>
                </div>
                <Switch
                  id="launch-worker-threads-enabled"
                  checked={activeInstance.workerThreads !== null}
                  disabled={!activeInstance.performanceFlags || savingLaunch || !canEditLaunchOptions}
                  onCheckedChange={(checked) =>
                    saveLaunchOptions({ workerThreads: checked ? activeInstance.workerThreads ?? 4 : null })
                  }
                  aria-label="Use worker thread override"
                />
              </div>
              <Input
                key={`${activeInstance.id}-${activeInstance.workerThreads ?? "auto"}`}
                id="launch-worker-threads"
                className="mt-3 h-9 max-w-28 text-sm"
                type="number"
                min={1}
                max={128}
                defaultValue={activeInstance.workerThreads ?? ""}
                disabled={
                  !activeInstance.performanceFlags ||
                  activeInstance.workerThreads === null ||
                  savingLaunch ||
                  !canEditLaunchOptions
                }
                onBlur={(event) => {
                  const value = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(value)) {
                    const workerThreads = Math.min(128, Math.max(1, value));
                    if (workerThreads !== activeInstance.workerThreads) {
                      saveLaunchOptions({ workerThreads });
                    }
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
            <EnchantedToggle
              id="launch-json-log-format"
              checked={activeInstance.jsonLogFormat}
              disabled={savingLaunch || !canEditLaunchOptions}
              onCheckedChange={(checked) => saveLaunchOptions({ jsonLogFormat: checked })}
              label="JSON log format"
              description="Starts Palworld with structured JSON log output."
            />
          </div>
          <p className="mt-3 text-xs text-parchment-300/45">
            Launch options apply to {activeInstance.name} the next time it starts.
            {!canEditLaunchOptions ? " Only the super admin can change them." : ""}
          </p>
        </ScrollPanel>
      )}

      <ScrollPanel
        icon={<Sliders />}
        title="Advanced Settings"
        actions={
          <RuneButton type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide" : `Show All (${advanced.length})`}
          </RuneButton>
        }
      >
        {showAdvanced ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {advanced.map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(v) => updateValue(field.key, v)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-parchment-300/50">
            {advanced.length} more settings, read straight from your server's own config file.
          </p>
        )}
      </ScrollPanel>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold-700/30 bg-abyss-900/95 bg-noise py-4 pl-[76px] pr-5 backdrop-blur-md lg:pl-64">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 lg:px-8">
          <p className="text-xs text-parchment-300/50">
            {dirty.size > 0
              ? `${dirty.size} unsaved change${dirty.size === 1 ? "" : "s"}, applies next server start.`
              : "All changes saved."}
          </p>
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={dirty.size === 0 || saving}>
            {saving ? "Saving..." : "Save Changes"}
          </RuneButton>
        </div>
      </div>
    </div>
  );
}
