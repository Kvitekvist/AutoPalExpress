import * as React from "react";
import { Info, Save, ServerCog } from "lucide-react";
import { serverSettingsApi } from "@/api";
import type { SettingField } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/useNotifications";

type FieldValue = boolean | number | string;

function fieldHelp(field: SettingField) {
  if (field.help) return field.help;
  if (field.options?.length) {
    return field.options.map((option) => `${option.label}: ${option.description ?? option.value}`).join("\n");
  }
  if (field.type === "bool") return "On enables this setting. Off disables it.";
  if (field.type === "int") return "Numeric setting. Example: 10 is low, 30 is moderate, 60+ is high.";
  if (field.type === "float") return "Decimal multiplier. Example: 0.5 is half, 1.0 is normal, 2.0 is double.";
  return "Written directly to PalWorldSettings.ini.";
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
        <TooltipContent className="max-w-sm whitespace-pre-line leading-relaxed">{fieldHelp(field)}</TooltipContent>
      </Tooltip>
    </span>
  );
}

function LocalApiField({
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
      <EnchantedToggle
        id={`local-api-${field.key}`}
        checked={Boolean(value)}
        onCheckedChange={onChange}
        label={label}
        compact
      />
    );
  }

  if (field.options?.length) {
    const stringValue = String(value ?? "");
    const hasCurrentValue = field.options.some((option) => option.value === stringValue);
    const options =
      hasCurrentValue || stringValue === ""
        ? field.options
        : [
            {
              value: stringValue,
              label: `${stringValue || "Current value"} (current)`,
              description: "Value currently stored in PalWorldSettings.ini.",
            },
            ...field.options,
          ];

    return (
      <div className="space-y-1.5">
        <Label htmlFor={`local-api-${field.key}`}>{label}</Label>
        <Select value={stringValue} onValueChange={(next) => onChange(next)}>
          <SelectTrigger id={`local-api-${field.key}`}>
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
      </div>
    );
  }

  const inputType = field.type === "int" || field.type === "float" ? "number" : field.sensitive ? "password" : "text";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`local-api-${field.key}`}>{label}</Label>
      <Input
        id={`local-api-${field.key}`}
        type={inputType}
        step={field.type === "float" ? "0.01" : undefined}
        value={value as string | number}
        onChange={(e) => {
          if (field.type === "int") onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10));
          else if (field.type === "float") onChange(e.target.value === "" ? 0 : parseFloat(e.target.value));
          else onChange(e.target.value);
        }}
      />
    </div>
  );
}

export function LocalApiSettingsPanel() {
  const [fields, setFields] = React.useState<SettingField[]>([]);
  const [values, setValues] = React.useState<Record<string, FieldValue>>({});
  const [dirty, setDirty] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const notifications = useNotifications();

  const load = React.useCallback(() => {
    serverSettingsApi.getSettings().then((data) => {
      const localApiFields = data.fields.filter((field) => field.group === "Local API");
      setFields(localApiFields);
      setValues(Object.fromEntries(localApiFields.map((field) => [field.key, field.value])));
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

  async function save() {
    if (dirty.size === 0) return;
    setSaving(true);
    try {
      const updates = Object.fromEntries([...dirty].map((key) => [key, values[key]]));
      const data = await serverSettingsApi.updateSettings(updates);
      const localApiFields = data.fields.filter((field) => field.group === "Local API");
      setFields(localApiFields);
      setValues(Object.fromEntries(localApiFields.map((field) => [field.key, field.value])));
      setDirty(new Set());
      notifications.success({ title: "Local API saved", message: "Restart the server for launch-time changes to apply." });
    } catch (e) {
      notifications.error({ title: "Couldn't save Local API", message: e instanceof Error ? e.message : "Unknown error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollPanel
      icon={<ServerCog />}
      title="Local API"
      actions={
        <RuneButton variant="gold" size="sm" icon={<Save />} onClick={save} disabled={dirty.size === 0 || saving}>
          {saving ? "Saving..." : "Save"}
        </RuneButton>
      }
    >
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        Palworld REST/API settings are kept here because they control how AutoPalExpress talks to the local server.
        Do not port-forward this API directly.
      </p>
      {fields.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <LocalApiField
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(value) => updateValue(field.key, value)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-parchment-300/50">
          No Local API fields are present in this server's current PalWorldSettings.ini.
        </p>
      )}
    </ScrollPanel>
  );
}
