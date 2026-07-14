import * as React from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { modsApi, nexusApi } from "@/api";
import type { Mod, ModWishlistRequest, NexusAccount, NexusModList, NexusModResult } from "@/types/models";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AncientTabs, AncientTabsList, AncientTabsTrigger } from "@/components/fantasy/AncientTabs";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { NexusModCard } from "@/components/mods/NexusModCard";
import { NexusFilePickerDialog } from "@/components/mods/NexusFilePickerDialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface ModsPageState {
  items: NexusModResult[];
  totalCount: number;
}

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
  const [cache, setCache] = React.useState<Partial<Record<NexusModList, ModsPageState>>>({});
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [installingId, setInstallingId] = React.useState<number | null>(null);
  const [requestingId, setRequestingId] = React.useState<number | null>(null);
  const [wishlist, setWishlist] = React.useState<ModWishlistRequest[]>([]);
  const [filePicker, setFilePicker] = React.useState<{ modId: number; modName: string } | null>(null);
  const [query, setQuery] = React.useState("");
  const [searchState, setSearchState] = React.useState<ModsPageState | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [searchingMore, setSearchingMore] = React.useState(false);
  const allCategory = t("mods.nexusBrowser.allCategory", { defaultValue: "All" });
  const [category, setCategory] = React.useState(allCategory);
  const isSearching = query.trim().length >= 2;

  React.useEffect(() => {
    nexusApi.getAccount().then(setAccount);
    modsApi.getWishlist().then(setWishlist);
  }, []);

  React.useEffect(() => {
    if (cache[list]) return;
    setLoading(true);
    setLoadError(null);
    nexusApi
      .getModList(list)
      .then((page) => setCache((prev) => ({ ...prev, [list]: { items: page.results, totalCount: page.totalCount } })))
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : t("mods.nexusBrowser.loadErrorFallback", { defaultValue: "Failed to load mods from Nexus Mods." }))
      )
      .finally(() => setLoading(false));
  }, [list, cache, t]);

  // Real Nexus-side search once the query looks intentional (2+ chars),
  // debounced so we don't fire a request per keystroke (TICKET-0144) -
  // previously "search" only ever filtered whichever 60 mods the
  // trending/latest tabs had already loaded, so most published mods could
  // never be found at all.
  React.useEffect(() => {
    if (!isSearching) {
      setSearchState(null);
      setSearchError(null);
      return;
    }
    const trimmed = query.trim();
    setSearching(true);
    const handle = setTimeout(() => {
      nexusApi
        .searchMods(trimmed)
        .then((page) => {
          setSearchState({ items: page.results, totalCount: page.totalCount });
          setSearchError(null);
        })
        .catch((e) =>
          setSearchError(e instanceof Error ? e.message : t("mods.nexusBrowser.searchErrorFallback", { defaultValue: "Failed to search Nexus Mods." }))
        )
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(handle);
  }, [query, isSearching, t]);

  // Both the tab lists and search are paginated (TICKET-0149) - Nexus's
  // GraphQL API only ever returns one page (60 items) per request, and a
  // broad search or a popular list can easily have hundreds more matches
  // than that, which used to be permanently unreachable.
  async function handleLoadMoreList() {
    const current = cache[list];
    if (!current) return;
    setLoadingMore(true);
    try {
      const page = await nexusApi.getModList(list, current.items.length);
      setCache((prev) => ({ ...prev, [list]: { items: [...current.items, ...page.results], totalCount: page.totalCount } }));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("mods.nexusBrowser.loadErrorFallback", { defaultValue: "Failed to load mods from Nexus Mods." }));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleLoadMoreSearch() {
    if (!searchState) return;
    setSearchingMore(true);
    try {
      const page = await nexusApi.searchMods(query.trim(), searchState.items.length);
      setSearchState((prev) => (prev ? { items: [...prev.items, ...page.results], totalCount: page.totalCount } : prev));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : t("mods.nexusBrowser.searchErrorFallback", { defaultValue: "Failed to search Nexus Mods." }));
    } finally {
      setSearchingMore(false);
    }
  }

  const results = isSearching ? searchState?.items ?? [] : cache[list]?.items ?? [];
  const totalCount = isSearching ? searchState?.totalCount ?? 0 : cache[list]?.totalCount ?? 0;
  const loading_ = isSearching ? searching : loading;
  const loadError_ = isSearching ? searchError : loadError;
  const loadingMore_ = isSearching ? searchingMore : loadingMore;
  const hasMore = results.length < totalCount;
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
    // Server-side search already matched the query; a short (1-char) query
    // isn't sent to Nexus at all, so still filter that locally against
    // whichever tab's already-loaded list is showing.
    if (isSearching || !query.trim()) return true;
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

  async function handleRequest(mod: NexusModResult) {
    setRequestingId(mod.modId);
    try {
      const updated = await modsApi.addToWishlist(mod);
      setWishlist(updated);
      notifications.success({
        title: t("mods.nexusBrowser.requestedTitle", { defaultValue: "Added to server wishlist" }),
        message: t("mods.nexusBrowser.requestedMessage", { defaultValue: "{{name}} is waiting for super-admin review.", name: mod.name }),
      });
    } catch (e) {
      notifications.error({
        title: t("mods.nexusBrowser.requestFailedTitle", { defaultValue: "Could not add mod" }),
        message: e instanceof Error ? e.message : t("mods.nexusBrowser.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gold-600/30 bg-gold-500/5 px-3 py-2 text-xs text-gold-400/90">
        {isSuperAdmin
          ? t("mods.nexusBrowser.bannerSuperAdmin", {
              defaultValue: "Browsing uses public Nexus metadata. Direct Install uses your saved Premium key; admins' wishlist requests wait for your approval in Super Admin.",
            })
          : t("mods.nexusBrowser.bannerAdmin", {
              defaultValue: "Browse public Nexus mod information and add mods to the server wishlist. The super admin decides whether to install each request.",
            })}
      </div>

      <AncientTabs value={list} onValueChange={(v) => setList(v as NexusModList)}>
        <AncientTabsList className={cn(isSearching && "pointer-events-none opacity-40")}>
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
          placeholder={t("mods.nexusBrowser.searchPlaceholder", { defaultValue: "Search all of Nexus Mods by name..." })}
          className="pl-9"
          autoFocus
        />
      </div>
      {isSearching && (
        <p className="text-[11px] text-parchment-300/40">
          {t("mods.nexusBrowser.searchingAllHint", {
            defaultValue: "Searching all of Nexus Mods, not just the tab above - clear the search to go back to browsing by list.",
          })}
        </p>
      )}

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
        {loading_ ? (
          <div className="flex h-32 items-center justify-center text-parchment-300/40">
            <p className="animate-pulse font-display">
              {isSearching
                ? t("mods.nexusBrowser.searching", { defaultValue: "Searching Nexus Mods..." })
                : t("mods.nexusBrowser.loading", { defaultValue: "Fetching from Nexus Mods..." })}
            </p>
          </div>
        ) : loadError_ ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-blood-400">
            <p className="text-sm">{loadError_}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-parchment-300/40">
            <p>{t("mods.nexusBrowser.empty", { defaultValue: "No mods found." })}</p>
          </div>
        ) : (
          <>
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
                  requested={wishlist.some((item) => item.nexusModId === mod.modId)}
                  requesting={requestingId === mod.modId}
                  onRequest={() => handleRequest(mod)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <RuneButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={isSearching ? handleLoadMoreSearch : handleLoadMoreList}
                  disabled={loadingMore_}
                >
                  {loadingMore_
                    ? t("mods.nexusBrowser.loadingMore", { defaultValue: "Loading more..." })
                    : t("mods.nexusBrowser.loadMore", {
                        defaultValue: "Load More ({{shown}} of {{total}})",
                        shown: results.length,
                        total: totalCount,
                      })}
                </RuneButton>
              </div>
            )}
          </>
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
