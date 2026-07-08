import * as React from "react";
import { Sparkles, Sliders, Save } from "lucide-react";
import { serverSettingsApi } from "@/api";
import type { SettingField } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { useNotifications } from "@/hooks/useNotifications";

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
  const [values, setValues] = React.useState<Record<string, FieldValue>>({});
  const [dirty, setDirty] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const notifications = useNotifications();

  const load = React.useCallback(() => {
    serverSettingsApi.getSettings().then((data) => {
      setFields(data.fields);
      setValues(Object.fromEntries(data.fields.map((f) => [f.key, f.value])));
      setDirty(new Set());
    });
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
