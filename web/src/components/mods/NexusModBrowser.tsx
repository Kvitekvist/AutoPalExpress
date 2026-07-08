import * as React from "react";
import { Search } from "lucide-react";
import { nexusApi } from "@/api";
import type { NexusModList, NexusModResult } from "@/types/models";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AncientTabs, AncientTabsList, AncientTabsTrigger } from "@/components/fantasy/AncientTabs";
import { NexusModCard } from "@/components/mods/NexusModCard";
import { cn } from "@/lib/utils";

const LISTS: { value: NexusModList; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "latest_added", label: "Latest Added" },
  { value: "latest_updated", label: "Latest Updated" },
];

interface NexusModBrowserProps {
  installedNames: string[];
}

export function NexusModBrowser({ installedNames }: NexusModBrowserProps) {
  const [list, setList] = React.useState<NexusModList>("trending");
  const [cache, setCache] = React.useState<Partial<Record<NexusModList, NexusModResult[]>>>({});
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("All");

  React.useEffect(() => {
    if (cache[list]) return;
    setLoading(true);
    setLoadError(null);
    nexusApi
      .getModList(list)
      .then((results) => setCache((prev) => ({ ...prev, [list]: results })))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load mods from Nexus Mods."))
      .finally(() => setLoading(false));
  }, [list, cache]);

  const results = cache[list] ?? [];
  const categories = ["All", ...Array.from(new Set(results.map((m) => m.categoryName))).sort()];
  const filtered = results.filter((m) => {
    if (category !== "All" && m.categoryName !== category) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) || m.author.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gold-600/30 bg-gold-500/5 px-3 py-2 text-xs text-gold-400/90">
        Browsing uses Nexus Mods metadata only, so no personal API key is needed. Download files on Nexus, then use
        "Install From File" in Super Admin so AutoPalExpress can verify the exact file before installing it.
      </div>

      <AncientTabs value={list} onValueChange={(v) => setList(v as NexusModList)}>
        <AncientTabsList>
          {LISTS.map((l) => (
            <AncientTabsTrigger key={l.value} value={l.value}>
              {l.label}
            </AncientTabsTrigger>
          ))}
        </AncientTabsList>
      </AncientTabs>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-300/40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter loaded results by name, author, or summary..."
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
            <p className="animate-pulse font-display">Fetching from Nexus Mods...</p>
          </div>
        ) : loadError ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-blood-400">
            <p className="text-sm">{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-parchment-300/40">
            <p>No mods found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((mod) => (
              <NexusModCard
                key={mod.id}
                mod={mod}
                installed={installedNames.some((n) => n.toLowerCase() === mod.name.toLowerCase())}
                installing={false}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
