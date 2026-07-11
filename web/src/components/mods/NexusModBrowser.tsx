import * as React from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { modsApi, nexusApi } from "@/api";
import type { Mod, NexusAccount, NexusModList, NexusModResult } from "@/types/models";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AncientTabs, AncientTabsList, AncientTabsTrigger } from "@/components/fantasy/AncientTabs";
import { NexusModCard } from "@/components/mods/NexusModCard";
import { NexusFilePickerDialog } from "@/components/mods/NexusFilePickerDialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const LISTS: { value: NexusModList; labelKey: string; labelDefault: string }[] = [
  { value: "trending", labelKey: "trending", labelDefault: "Trending" },
  { value: "latest_added", labelKey: "latestAdded", labelDefault: "Latest Added" },
  { value: "latest_updated", labelKey: "latestUpdated", labelDefault: "Latest Updated" },
];

interface NexusModBrowserProps {
  installedNames: string[];
  onModsChanged: (mods: Mod[]) => void;
}

export function NexusModBrowser({ installedNames, onModsChanged }: NexusModBrowserProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();
  const [account, setAccount] = React.useState<NexusAccount | null>(null);
  const [list, setList] = React.useState<NexusModList>("trending");
  const [cache, setCache] = React.useState<Partial<Record<NexusModList, NexusModResult[]>>>({});
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [installingId, setInstallingId] = React.useState<number | null>(null);
  const [filePicker, setFilePicker] = React.useState<{ modId: number; modName: string } | null>(null);
  const [query, setQuery] = React.useState("");
  const allCategory = t("mods.nexusBrowser.allCategory", { defaultValue: "All" });
  const [category, setCategory] = React.useState(allCategory);

  React.useEffect(() => {
    nexusApi.getAccount().then(setAccount);
  }, []);

  React.useEffect(() => {
    if (cache[list]) return;
    setLoading(true);
    setLoadError(null);
    nexusApi
      .getModList(list)
      .then((results) => setCache((prev) => ({ ...prev, [list]: results })))
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : t("mods.nexusBrowser.loadErrorFallback", { defaultValue: "Failed to load mods from Nexus Mods." }))
      )
      .finally(() => setLoading(false));
  }, [list, cache, t]);

  const results = cache[list] ?? [];
  const isSuperAdmin = user.role === "super_admin";
  const canDirectInstall = isSuperAdmin && Boolean(account?.connected && account.isPremium);
  const directInstallUnavailableReason = !isSuperAdmin
    ? null
    : !account?.connected
      ? t("mods.nexusBrowser.needsApiKey", { defaultValue: "Direct install needs a saved Nexus Mods API key in Super Admin." })
      : !account.isPremium
        ? t("mods.nexusBrowser.needsPremium", { defaultValue: "Direct install needs Nexus Premium download access." })
        : null;
  const categories = [allCategory, ...Array.from(new Set(results.map((m) => m.categoryName))).sort()];
  const filtered = results.filter((m) => {
    if (category !== allCategory && m.categoryName !== category) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) || m.author.toLowerCase().includes(q);
  });

  async function handleInstall(mod: NexusModResult) {
    setInstallingId(mod.modId);
    try {
      const files = await modsApi.getNexusModFiles(mod.modId);
      if (files.length > 1) {
        setFilePicker({ modId: mod.modId, modName: mod.name });
        return;
      }
      const updated = await modsApi.installFromNexus(mod.modId, files[0]?.fileId);
      onModsChanged(updated);
      notifications.success({
        title: t("mods.nexusBrowser.installedTitle", { defaultValue: "Mod installed" }),
        message: t("mods.nexusBrowser.installedMessage", { defaultValue: "{{name}} was installed from Nexus Mods.", name: mod.name }),
      });
    } catch (e) {
      notifications.error({
        title: t("mods.nexusBrowser.installFailedTitle", { defaultValue: "Nexus install failed" }),
        message: e instanceof Error ? e.message : t("mods.nexusBrowser.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setInstallingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gold-600/30 bg-gold-500/5 px-3 py-2 text-xs text-gold-400/90">
        {t("mods.nexusBrowser.banner", {
          defaultValue:
            "Browsing uses Nexus Mods metadata only. Direct Install appears on each card and turns on when Super Admin has a saved Nexus Premium API key; Install File remains available for downloaded archives.",
        })}
      </div>

      <AncientTabs value={list} onValueChange={(v) => setList(v as NexusModList)}>
        <AncientTabsList>
          {LISTS.map((l) => (
            <AncientTabsTrigger key={l.value} value={l.value}>
              {t(`mods.nexusBrowser.lists.${l.labelKey}`, { defaultValue: l.labelDefault })}
            </AncientTabsTrigger>
          ))}
        </AncientTabsList>
      </AncientTabs>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-300/40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("mods.nexusBrowser.filterPlaceholder", { defaultValue: "Filter loaded results by name, author, or summary..." })}
          className="pl-9"
          autoFocus
        />
      </div>

      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === c
                  ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
                  : "border-stone-600 text-parchment-300/60 hover:border-gold-600/40"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="h-[440px] rounded-md border border-stone-700 bg-abyss-950/40 p-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-parchment-300/40">
            <p className="animate-pulse font-display">{t("mods.nexusBrowser.loading", { defaultValue: "Fetching from Nexus Mods..." })}</p>
          </div>
        ) : loadError ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-blood-400">
            <p className="text-sm">{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-parchment-300/40">
            <p>{t("mods.nexusBrowser.empty", { defaultValue: "No mods found." })}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((mod) => (
              <NexusModCard
                key={mod.id}
                mod={mod}
                installed={installedNames.some((n) => n.toLowerCase() === mod.name.toLowerCase())}
                canInstallFromFile={isSuperAdmin}
                canDirectInstall={canDirectInstall}
                directInstallUnavailableReason={directInstallUnavailableReason}
                installing={installingId === mod.modId}
                onInstall={() => handleInstall(mod)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <NexusFilePickerDialog
        open={filePicker != null}
        onOpenChange={(open) => {
          if (!open) setFilePicker(null);
        }}
        nexusModId={filePicker?.modId ?? null}
        modName={filePicker?.modName ?? ""}
        onInstalled={onModsChanged}
      />
    </div>
  );
}
