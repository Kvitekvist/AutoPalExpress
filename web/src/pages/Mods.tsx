import * as React from "react";
import { Link } from "react-router-dom";
import { Reorder } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BookOpen, ScrollText, TriangleAlert } from "lucide-react";
import { modsApi } from "@/api";
import type { Mod, ModsPathInfo } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { ModCard } from "@/components/mods/ModCard";
import { NexusBrowseDialog } from "@/components/mods/NexusBrowseDialog";
import { Ue4ssPanel } from "@/components/mods/Ue4ssPanel";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

export default function Mods() {
  const { t } = useTranslation();
  const [mods, setMods] = React.useState<Mod[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<Mod | null>(null);
  const [browseOpen, setBrowseOpen] = React.useState(false);
  const [modsPathInfo, setModsPathInfo] = React.useState<ModsPathInfo | null>(null);
  const notifications = useNotifications();
  const { user } = useAuth();

  React.useEffect(() => {
    modsApi.getMods().then((m) => {
      setMods(m);
      setLoading(false);
    });
    modsApi.getModsPath().then(setModsPathInfo);
  }, []);

  async function handleReorder(next: Mod[]) {
    const withPriority = next.map((m, i) => ({ ...m, loadPriority: i + 1 }));
    setMods(withPriority);
    await modsApi.reorderMods(withPriority.map((m) => m.id));
  }

  async function handleToggle(mod: Mod, next: boolean) {
    setBusyId(mod.id);
    try {
      const updated = next ? await modsApi.enableMod(mod.id) : await modsApi.disableMod(mod.id);
      setMods(updated);
      notifications.success({
        title: next
          ? t("mods.notifications.enabledTitle", { defaultValue: "Mod enabled" })
          : t("mods.notifications.disabledTitle", { defaultValue: "Mod disabled" }),
        message: next
          ? t("mods.notifications.enabledMessage", { defaultValue: "{{name}} runes are now glowing.", name: mod.name })
          : t("mods.notifications.disabledMessage", { defaultValue: "{{name}} runes are now dormant.", name: mod.name }),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdate(mod: Mod) {
    setBusyId(mod.id);
    try {
      const updated = await modsApi.updateMod(mod.id);
      setMods(updated);
      notifications.info({
        title: t("mods.notifications.updatedTitle", { defaultValue: "Mod updated" }),
        message: t("mods.notifications.updatedMessage", {
          defaultValue: "{{name}} has been reforged to v{{version}}.",
          name: mod.name,
          version: mod.latestVersion,
        }),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setBusyId(removeTarget.id);
    try {
      const updated = await modsApi.removeMod(removeTarget.id);
      setMods(updated);
      notifications.warning({
        title: t("mods.notifications.removedTitle", { defaultValue: "Mod removed" }),
        message: t("mods.notifications.removedMessage", {
          defaultValue: "{{name}} has been struck from the archive.",
          name: removeTarget.name,
        }),
      });
    } finally {
      setBusyId(null);
      setRemoveTarget(null);
    }
  }

  const enabledCount = mods.filter((m) => m.status === "enabled").length;
  const brokenCount = mods.filter((m) => m.status === "broken").length;

  return (
    <div className="space-y-6">
      <ScrollPanel
        icon={<BookOpen />}
        title={t("mods.title", { defaultValue: "The Grimoire" })}
        actions={
          <>
            <RuneButton variant="mana" size="sm" icon={<ScrollText />} onClick={() => setBrowseOpen(true)}>
              {t("mods.browseNexus", { defaultValue: "Browse Nexus Mods" })}
            </RuneButton>
          </>
        }
      >
        {modsPathInfo && !modsPathInfo.modsPath && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-md border border-gold-600/30 bg-gold-500/5 px-4 py-3 text-xs text-gold-300">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span>{t("mods.noModsPathBanner", { defaultValue: "No Mods folder is configured yet, so verified file installs need Super Admin setup first." })}</span>
            {user.role === "super_admin" ? (
              <Link to="/super-admin" className="ml-auto font-semibold underline decoration-dotted underline-offset-2 hover:text-gold-200">
                {t("mods.noModsPathCta", { defaultValue: "Set it up in Super Admin" })}
              </Link>
            ) : (
              <span className="ml-auto text-gold-300/70">{t("mods.noModsPathAskAdmin", { defaultValue: "Ask the super admin to set it up." })}</span>
            )}
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-parchment-300/60">
          <span>
            <span className="font-mono text-life-400">{enabledCount}</span> {t("mods.status.enabled", { defaultValue: "enabled" })}
          </span>
          <span>
            <span className="font-mono text-parchment-300/50">{mods.length - enabledCount - brokenCount}</span>{" "}
            {t("mods.status.disabled", { defaultValue: "disabled" })}
          </span>
          {brokenCount > 0 && (
            <span>
              <span className="font-mono text-blood-400">{brokenCount}</span> {t("mods.status.broken", { defaultValue: "broken" })}
            </span>
          )}
          <span className="ml-auto text-parchment-300/40">{t("mods.dragHint", { defaultValue: "Drag the handle to change load priority" })}</span>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-parchment-300/50">
            <p className="animate-pulse font-display">{t("mods.loading", { defaultValue: "Unsealing the grimoire..." })}</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={mods} onReorder={handleReorder} className="space-y-4">
            {mods.map((mod) => (
              <ModCard
                key={mod.id}
                mod={mod}
                onToggle={handleToggle}
                onRemove={setRemoveTarget}
                onUpdate={handleUpdate}
                busy={busyId === mod.id}
              />
            ))}
          </Reorder.Group>
        )}
      </ScrollPanel>

      <Ue4ssPanel />

      <RuneDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        tone="danger"
        title={t("mods.removeDialog.title", { defaultValue: "Remove this mod?" })}
        description={t("mods.removeDialog.description", {
          defaultValue: "{{name}} will be permanently removed from your server's load order.",
          name: removeTarget?.name,
        })}
        confirmLabel={t("mods.removeDialog.confirm", { defaultValue: "Remove" })}
        onConfirm={handleRemove}
        confirming={busyId === removeTarget?.id}
      />

      <NexusBrowseDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        installedNames={mods.map((m) => m.name)}
        onModsChanged={setMods}
      />
    </div>
  );
}
