import * as React from "react";
import { Info, Save, Sliders, Sparkles } from "lucide-react";
import { serverSettingsApi } from "@/api";
import type { SettingField } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { useNotifications } from "@/hooks/useNotifications";

type FieldValue = boolean | number | string;

const GROUP_ORDER = [
  "Identity and Access",
  "World Rules",
  "Combat",
  "Progression",
  "Time and Survival",
  "World Density",
  "Bases and Work",
  "Saving and Backups",
  "Performance Limits",
  "Mods and Compatibility",
  "Other",
];

function settingHelp(field: SettingField) {
  if (field.help) return field.help;
  if (field.options?.length) {
    return field.options.map((option) => `${option.label}: ${option.description ?? option.value}`).join("\n");
  }
  if (field.type === "bool") return "On enables this setting. Off disables it.";
  if (field.type === "int") return "Numeric setting. Example: 10 is a lower limit, 30 is moderate, 60+ is high. The exact meaning depends on the setting.";
  if (field.type === "float") return "Decimal multiplier. Example: 0.5 is half strength/speed, 1.0 is normal, 2.0 is double.";
  if (field.type === "raw") return "Advanced raw Palworld value. Keep the existing format unless you know the exact value Palworld expects.";
  return "Text setting written directly to PalWorldSettings.ini.";
}

function FieldLabel({ field }: { field: SettingField }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{field.label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gold-400/80 hover:bg-gold-500/10 hover:text-gold-300"
            aria-label={`${field.label} help`}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-line leading-relaxed">{settingHelp(field)}</TooltipContent>
      </Tooltip>
    </span>
  );
}

function groupedFields(fields: SettingField[]) {
  const byGroup = new Map<string, SettingField[]>();
  for (const field of fields) {
    const group = field.group || "Other";
    byGroup.set(group, [...(byGroup.get(group) ?? []), field]);
  }
  return [...byGroup.entries()].sort(([a], [b]) => {
    const ai = GROUP_ORDER.indexOf(a);
    const bi = GROUP_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b);
  });
}

function FieldGroups({
  fields,
  values,
  onChange,
}: {
  fields: SettingField[];
  values: Record<string, FieldValue>;
  onChange: (key: string, value: FieldValue) => void;
}) {
  return (
    <div className="space-y-7">
      {groupedFields(fields).map(([group, groupFields], index) => (
        <section
          key={group}
          className={[
            "space-y-3 rounded-md border-y px-3 py-4",
            index % 2 === 0
              ? "border-gold-700/25 bg-abyss-900/22"
              : "border-stone-600/45 bg-stone-800/22",
          ].join(" ")}
        >
          <h4 className="font-display text-sm font-semibold text-gold-300">{group}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groupFields.map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(v) => onChange(field.key, v)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: SettingField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  const label = <FieldLabel field={field} />;

  if (field.type === "bool") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`field-${field.key}`}>{label}</Label>
        <EnchantedToggle
          id={`field-${field.key}`}
          checked={Boolean(value)}
          onCheckedChange={onChange}
          label={<span className="sr-only">{field.label}</span>}
          compact
        />
        {field.description && <p className="text-xs text-parchment-300/40">{field.description}</p>}
      </div>
    );
  }

  if (field.options?.length) {
    const stringValue = String(value ?? "");
    const hasCurrentValue = field.options.some((option) => option.value === stringValue);
    const options = hasCurrentValue || stringValue === ""
      ? field.options
      : [{ value: stringValue, label: `${stringValue || "Current value"} (current)`, description: "Value currently stored in PalWorldSettings.ini." }, ...field.options];
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`field-${field.key}`}>{label}</Label>
        <Select value={stringValue} onValueChange={(next) => onChange(next)}>
          <SelectTrigger id={`field-${field.key}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.description && <p className="text-xs text-parchment-300/40">{field.description}</p>}
      </div>
    );
  }

  const inputType = field.type === "int" || field.type === "float" ? "number" : field.sensitive ? "password" : "text";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${field.key}`}>{label}</Label>
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

  const visibleFields = fields.filter((f) => f.group !== "Local API");
  const popular = visibleFields.filter((f) => f.popular);
  const advanced = visibleFields.filter((f) => !f.popular);

  return (
    <div className="space-y-6 pb-24">
      <ScrollPanel icon={<Sparkles />} title="Popular Settings">
        <FieldGroups fields={popular} values={values} onChange={updateValue} />
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
          <FieldGroups fields={advanced} values={values} onChange={updateValue} />
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
