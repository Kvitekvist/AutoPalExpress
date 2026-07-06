import * as React from "react";
import { Link } from "react-router-dom";
import { Reorder } from "framer-motion";
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
        title: next ? "Mod enabled" : "Mod disabled",
        message: `${mod.name} runes are now ${next ? "glowing" : "dormant"}.`,
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
      notifications.info({ title: "Mod updated", message: `${mod.name} has been reforged to v${mod.latestVersion}.` });
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
      notifications.warning({ title: "Mod removed", message: `${removeTarget.name} has been struck from the archive.` });
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
        title="The Grimoire"
        actions={
          <>
            <RuneButton variant="mana" size="sm" icon={<ScrollText />} onClick={() => setBrowseOpen(true)}>
              Browse Nexus Mods
            </RuneButton>
          </>
        }
      >
        {modsPathInfo && !modsPathInfo.modsPath && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-md border border-gold-600/30 bg-gold-500/5 px-4 py-3 text-xs text-gold-300">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span>No Mods folder is configured, so installs are downloaded but not placed on disk yet.</span>
            {user.role === "super_admin" ? (
              <Link to="/settings" className="ml-auto font-semibold underline decoration-dotted underline-offset-2 hover:text-gold-200">
                Set it up in Settings
              </Link>
            ) : (
              <span className="ml-auto text-gold-300/70">Ask the super admin to set it up.</span>
            )}
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-parchment-300/60">
          <span>
            <span className="font-mono text-life-400">{enabledCount}</span> enabled
          </span>
          <span>
            <span className="font-mono text-parchment-300/50">{mods.length - enabledCount - brokenCount}</span> disabled
          </span>
          {brokenCount > 0 && (
            <span>
              <span className="font-mono text-blood-400">{brokenCount}</span> broken
            </span>
          )}
          <span className="ml-auto text-parchment-300/40">Drag the handle to change load priority</span>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-parchment-300/50">
            <p className="animate-pulse font-display">Unsealing the grimoire...</p>
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
        title="Remove this mod?"
        description={`${removeTarget?.name} will be permanently removed from your server's load order.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        confirming={busyId === removeTarget?.id}
      />

      <NexusBrowseDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        installedNames={mods.map((m) => m.name)}
        onInstalled={(updated) => setMods(updated)}
      />
    </div>
  );
}
