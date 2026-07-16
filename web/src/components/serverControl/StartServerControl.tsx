import * as React from "react";
import { useTranslation } from "react-i18next";
import { Play, ChevronDown } from "lucide-react";
import { instancesApi } from "@/api";
import type { InstanceListView } from "@/types/models";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function StartServerControl({
  disabled,
  busy,
  onStart,
}: {
  disabled: boolean;
  busy: boolean;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = React.useState<InstanceListView | null>(null);
  const [switching, setSwitching] = React.useState(false);

  const refresh = React.useCallback(() => {
    instancesApi.list().then(setData);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const active = data?.instances.find((i) => i.id === data.activeId);

  async function handleSwitch(id: string) {
    if (id === data?.activeId) return;
    setSwitching(true);
    await instancesApi.setActive(id);
    // Start/Stop act on whatever is active - reload so every page (not just
    // this control) reflects the new target before anyone clicks Start.
    window.location.reload();
  }

  return (
    <div
      className={cn(
        "relative flex h-24 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md border font-display transition-colors",
        "border-life-500/50 bg-gradient-to-b from-stone-800 to-abyss-900 text-life-400 hover:border-life-400",
        (disabled || busy || switching) && "pointer-events-none opacity-40 grayscale"
      )}
    >
      {data && data.instances.length > 1 && (
        <div className="absolute right-1.5 top-1.5 z-10 pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-0.5 rounded border border-stone-600 bg-abyss-950/60 px-1.5 py-0.5 text-[10px] text-parchment-300/60 transition-colors hover:border-gold-600/50 hover:text-gold-300"
              >
                {t("serverControl.change", { defaultValue: "Change" })} <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {data.instances.map((instance) => (
                <DropdownMenuItem key={instance.id} onSelect={() => handleSwitch(instance.id)}>
                  {instance.id === data.activeId ? "✓ " : ""}
                  {t("serverControl.nameAndPort", { defaultValue: "{{name}} · port {{port}}", name: instance.name, port: instance.gamePort })}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <button type="button" onClick={onStart} disabled={disabled || busy || switching} className="flex flex-col items-center gap-1">
        <Play className="h-7 w-7" />
        <span className="text-sm">{busy ? t("serverControl.working", { defaultValue: "Working..." }) : t("serverControl.startServer", { defaultValue: "Start Server" })}</span>
        <span className="max-w-[10rem] truncate text-[10px] font-sans normal-case tracking-normal text-parchment-300/50">
          {active
            ? t("serverControl.nameAndPort", { defaultValue: "{{name}} · port {{port}}", name: active.name, port: active.gamePort })
            : t("serverControl.noServerSelected", { defaultValue: "No server selected" })}
        </span>
      </button>
    </div>
  );
}
