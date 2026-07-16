import * as React from "react";
import { useTranslation } from "react-i18next";
import { Info, Save, Sliders, Sparkles } from "lucide-react";
import { serverSettingsApi } from "@/api";
import type { SettingField } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { useNotifications } from "@/hooks/useNotifications";

type FieldValue = boolean | number | string;
type Translate = ReturnType<typeof useTranslation>["t"];

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

// Translation keys are looked up by the field's stable backend `key` (and,
// for dropdowns, the option's exact English `value`) rather than by the
// English text itself, so relabeling the English source never breaks a
// translation. The English text itself is never stored a second time here -
// t()'s defaultValue is always the backend-provided English string, so
// English keeps working even for fields/options a locale hasn't translated
// yet (see TICKET-0067).
function fieldLabel(t: Translate, field: SettingField): string {
  return t(`worldSettings.fields.${field.key}.label`, { defaultValue: field.label });
}

function fieldDescription(t: Translate, field: SettingField): string | null {
  if (!field.description) return null;
  return t(`worldSettings.fields.${field.key}.description`, { defaultValue: field.description });
}

function optionLabel(t: Translate, field: SettingField, value: string, fallback: string): string {
  return t(`worldSettings.fields.${field.key}.options.${value}.label`, { defaultValue: fallback });
}

function optionDescription(t: Translate, field: SettingField, value: string, fallback: string | null): string | null {
  if (!fallback) return null;
  return t(`worldSettings.fields.${field.key}.options.${value}.description`, { defaultValue: fallback });
}

function settingHelp(t: Translate, field: SettingField) {
  if (field.help) return t(`worldSettings.fields.${field.key}.help`, { defaultValue: field.help });
  if (field.options?.length) {
    return field.options
      .map(
        (option) =>
          `${optionLabel(t, field, option.value, option.label)}: ${optionDescription(t, field, option.value, option.description) ?? option.value}`
      )
      .join("\n");
  }
  if (field.type === "bool")
    return t("worldSettings.chrome.helpBool", { defaultValue: "On enables this setting. Off disables it." });
  if (field.type === "int")
    return t("worldSettings.chrome.helpInt", {
      defaultValue:
        "Numeric setting. Example: 10 is a lower limit, 30 is moderate, 60+ is high. The exact meaning depends on the setting.",
    });
  if (field.type === "float")
    return t("worldSettings.chrome.helpFloat", {
      defaultValue: "Decimal multiplier. Example: 0.5 is half strength/speed, 1.0 is normal, 2.0 is double.",
    });
  if (field.type === "raw")
    return t("worldSettings.chrome.helpRaw", {
      defaultValue:
        "Advanced raw Palworld value. Keep the existing format unless you know the exact value Palworld expects.",
    });
  return t("worldSettings.chrome.helpString", {
    defaultValue: "Text setting written directly to PalWorldSettings.ini.",
  });
}

function FieldLabel({ field }: { field: SettingField }) {
  const { t } = useTranslation();
  const label = fieldLabel(t, field);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gold-400/80 hover:bg-gold-500/10 hover:text-gold-300"
            aria-label={t("worldSettings.chrome.fieldHelpAria", { defaultValue: "{{label}} help", label })}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-line leading-relaxed">
          {settingHelp(t, field)}
        </TooltipContent>
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
  const { t } = useTranslation();
  return (
    <div className="space-y-7">
      {groupedFields(fields).map(([group, groupFields], index) => (
        <section
          key={group}
          className={[
            "space-y-3 rounded-md border-y px-3 py-4",
            index % 2 === 0 ? "border-gold-700/25 bg-abyss-900/22" : "border-stone-600/45 bg-stone-800/22",
          ].join(" ")}
        >
          <h4 className="font-display text-sm font-semibold text-gold-300">
            {t(`worldSettings.groups.${group}`, { defaultValue: group })}
          </h4>
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
  const { t } = useTranslation();
  const label = <FieldLabel field={field} />;
  const description = fieldDescription(t, field);

  if (field.type === "bool") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`field-${field.key}`}>{label}</Label>
        <EnchantedToggle
          id={`field-${field.key}`}
          checked={Boolean(value)}
          onCheckedChange={onChange}
          label={t("worldSettings.chrome.enableOrDisable", { defaultValue: "Enable or Disable" })}
          compact
        />
        {description && <p className="text-xs text-parchment-300/40">{description}</p>}
      </div>
    );
  }

  if (field.options?.length) {
    // The dropdown's `value` is always Palworld's exact English enum string
    // (e.g. "Normal", "Item") - only the displayed label/description are
    // translated. Whatever the user picks, that untouched English value is
    // what gets sent back and written into PalWorldSettings.ini.
    const stringValue = String(value ?? "");
    const hasCurrentValue = field.options.some((option) => option.value === stringValue);
    const options =
      hasCurrentValue || stringValue === ""
        ? field.options
        : [
            {
              value: stringValue,
              label: t("worldSettings.chrome.currentValueLabel", {
                defaultValue: "{{value}} (current)",
                value: stringValue || t("worldSettings.chrome.currentValueUnknown", { defaultValue: "Current value" }),
              }),
              description: t("worldSettings.chrome.currentValueDescription", {
                defaultValue: "Value currently stored in PalWorldSettings.ini.",
              }),
            },
            ...field.options,
          ];
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
                {optionLabel(t, field, option.value, option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description && <p className="text-xs text-parchment-300/40">{description}</p>}
      </div>
    );
  }

  const inputType = field.type === "int" || field.type === "float" ? "number" : "text";
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (field.type === "int") onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10));
    else if (field.type === "float") onChange(e.target.value === "" ? 0 : parseFloat(e.target.value));
    else onChange(e.target.value);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${field.key}`}>{label}</Label>
      {field.sensitive ? (
        <PasswordInput id={`field-${field.key}`} value={value as string} onChange={handleChange} />
      ) : (
        <Input
          id={`field-${field.key}`}
          type={inputType}
          step={field.type === "float" ? "0.01" : undefined}
          value={value as string | number}
          onChange={handleChange}
        />
      )}
      {description && <p className="text-xs text-parchment-300/40">{description}</p>}
    </div>
  );
}

export default function WorldSettings() {
  const { t } = useTranslation();
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
        title: t("worldSettings.chrome.settingsSavedTitle", { defaultValue: "Settings saved" }),
        message: t("worldSettings.chrome.settingsSavedMessage", {
          defaultValue: "Changes take effect the next time the server starts.",
        }),
      });
    } catch (e) {
      notifications.error({
        title: t("worldSettings.chrome.couldntSave", { defaultValue: "Couldn't save" }),
        message:
          e instanceof Error ? e.message : t("worldSettings.chrome.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!fields) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="animate-pulse font-display">
          {t("worldSettings.chrome.unrolling", { defaultValue: "Unrolling the ancient scroll..." })}
        </p>
      </div>
    );
  }

  const visibleFields = fields.filter((f) => f.group !== "Local API");
  const popular = visibleFields.filter((f) => f.popular);
  const advanced = visibleFields.filter((f) => !f.popular);

  return (
    <div className="space-y-6 pb-24">
      <ScrollPanel
        icon={<Sparkles />}
        title={t("worldSettings.chrome.popularSettings", { defaultValue: "Popular Settings" })}
      >
        <FieldGroups fields={popular} values={values} onChange={updateValue} />
      </ScrollPanel>

      <ScrollPanel
        icon={<Sliders />}
        title={t("worldSettings.chrome.advancedSettings", { defaultValue: "Advanced Settings" })}
        actions={
          <RuneButton type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced
              ? t("worldSettings.chrome.hide", { defaultValue: "Hide" })
              : t("worldSettings.chrome.showAll", { defaultValue: "Show All ({{count}})", count: advanced.length })}
          </RuneButton>
        }
      >
        {showAdvanced ? (
          <FieldGroups fields={advanced} values={values} onChange={updateValue} />
        ) : (
          <p className="text-sm text-parchment-300/50">
            {advanced.length === 1
              ? t("worldSettings.chrome.moreSettingsOne", {
                  defaultValue: "{{count}} more setting, read straight from your server's own config file.",
                  count: advanced.length,
                })
              : t("worldSettings.chrome.moreSettingsMany", {
                  defaultValue: "{{count}} more settings, read straight from your server's own config file.",
                  count: advanced.length,
                })}
          </p>
        )}
      </ScrollPanel>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold-700/30 bg-abyss-900/95 bg-noise py-4 pl-[76px] pr-5 backdrop-blur-md lg:pl-64">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 lg:px-8">
          <p className="text-xs text-parchment-300/50">
            {dirty.size > 0
              ? dirty.size === 1
                ? t("worldSettings.chrome.unsavedChangeOne", {
                    defaultValue: "{{count}} unsaved change, applies next server start.",
                    count: dirty.size,
                  })
                : t("worldSettings.chrome.unsavedChangeMany", {
                    defaultValue: "{{count}} unsaved changes, applies next server start.",
                    count: dirty.size,
                  })
              : t("worldSettings.chrome.allSaved", { defaultValue: "All changes saved." })}
          </p>
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={dirty.size === 0 || saving}>
            {saving
              ? t("worldSettings.chrome.saving", { defaultValue: "Saving..." })
              : t("worldSettings.chrome.saveChanges", { defaultValue: "Save Changes" })}
          </RuneButton>
        </div>
      </div>
    </div>
  );
}
