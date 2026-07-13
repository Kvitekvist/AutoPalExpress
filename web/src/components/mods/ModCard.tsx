import { Reorder, useDragControls } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GripVertical, User, Layers, TriangleAlert, Trash2, ArrowUpCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mod } from "@/types/models";
import { SpellCard } from "@/components/fantasy/SpellCard";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { RuneButton } from "@/components/fantasy/RuneButton";

interface ModCardProps {
  mod: Mod;
  onToggle: (mod: Mod, next: boolean) => void;
  onRemove: (mod: Mod) => void;
  onRequestUpdate: (mod: Mod) => void;
  updateRequested: boolean;
  busy?: boolean;
}

const STATUS_BADGE: Record<Mod["status"], string> = {
  enabled: "border-life-500/50 bg-life-500/10 text-life-400",
  disabled: "border-stone-600 bg-stone-800 text-parchment-300/50",
  broken: "border-blood-500/50 bg-blood-500/10 text-blood-400",
};

export function ModCard({ mod, onToggle, onRemove, onRequestUpdate, updateRequested, busy }: ModCardProps) {
  const { t } = useTranslation();
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={mod}
      dragListener={false}
      dragControls={dragControls}
      as="div"
    >
      <SpellCard status={mod.status}>
        <div className="flex items-start gap-3">
          <button
            onPointerDown={(e) => dragControls.start(e)}
            className="mt-1 shrink-0 cursor-grab touch-none text-parchment-300/30 transition-colors hover:text-gold-400 active:cursor-grabbing"
            aria-label={t("mods.card.dragToReorder", { defaultValue: "Drag to reorder" })}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-600/40 bg-abyss-900 font-mono text-xs font-bold text-gold-400">
            {mod.loadPriority}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-semibold text-parchment-100">{mod.name}</h3>
                <span className="font-mono text-xs text-parchment-300/45">v{mod.version}</span>
              </div>
              <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", STATUS_BADGE[mod.status])}>
                {t(`mods.status.${mod.status}`, { defaultValue: mod.status })}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-parchment-300/50">
              <User className="h-3 w-3" /> {mod.author}
            </div>

            <p className="mt-2.5 text-sm leading-relaxed text-parchment-300/75">{mod.description}</p>

            {mod.dependencies.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-parchment-300/40" />
                {mod.dependencies.map((dep) => (
                  <span key={dep} className="rounded-full border border-stone-600 bg-stone-800/60 px-2 py-0.5 text-[11px] text-parchment-300/60">
                    {dep}
                  </span>
                ))}
              </div>
            )}

            {mod.status === "broken" && (
              <div className="mt-3 flex items-center gap-1.5 rounded-md border border-blood-600/30 bg-blood-500/5 px-3 py-2 text-xs text-blood-400">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                {t("mods.card.brokenNotice", { defaultValue: "Failed to initialize — remove or replace this mod." })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-700/60 pt-3.5">
              <EnchantedToggle
                id={`mod-toggle-${mod.id}`}
                checked={mod.status === "enabled"}
                onCheckedChange={(v) => onToggle(mod, v)}
                label={
                  mod.status === "enabled"
                    ? t("mods.card.enabledLabel", { defaultValue: "Enabled" })
                    : t("mods.card.disabledLabel", { defaultValue: "Disabled" })
                }
                disabled={mod.status === "broken" || busy}
                className="flex-1 border-none bg-transparent px-0 py-0"
              />
              <div className="flex items-center gap-2">
                {mod.updateAvailable && (
                  updateRequested ? (
                    <span className="flex items-center gap-1.5 rounded-md border border-gold-600/30 bg-gold-500/5 px-3 py-2 text-xs font-medium text-gold-300/80">
                      <Check className="h-3.5 w-3.5" />
                      {t("mods.card.updateRequested", { defaultValue: "Update Requested" })}
                    </span>
                  ) : (
                    <RuneButton
                      variant="mana"
                      size="sm"
                      icon={<ArrowUpCircle />}
                      onClick={() => onRequestUpdate(mod)}
                      disabled={busy}
                      title={t("mods.card.requestUpdateTooltip", { defaultValue: "Ask the super admin to approve and install this update." })}
                    >
                      {t("mods.card.requestUpdateTo", { defaultValue: "Request Update to {{version}}", version: mod.latestVersion })}
                    </RuneButton>
                  )
                )}
                <RuneButton variant="danger" size="sm" icon={<Trash2 />} onClick={() => onRemove(mod)} disabled={busy}>
                  {t("mods.card.remove", { defaultValue: "Remove" })}
                </RuneButton>
              </div>
            </div>
          </div>
        </div>
      </SpellCard>
    </Reorder.Item>
  );
}
