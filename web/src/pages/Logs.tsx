import * as React from "react";
import { ScrollText, Search, Download, Info, TriangleAlert, Bug, Ban } from "lucide-react";
import { logsApi } from "@/api";
import type { LogEntry, LogLevel } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { AncientTabs, AncientTabsList, AncientTabsTrigger } from "@/components/fantasy/AncientTabs";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

type LevelFilter = "all" | LogLevel;

const LEVEL_CONFIG: Record<LogLevel, { icon: typeof Info; text: string; border: string; bg: string }> = {
  info: { icon: Info, text: "text-mana-300", border: "border-l-mana-500/50", bg: "" },
  warning: { icon: TriangleAlert, text: "text-gold-400", border: "border-l-gold-500/60", bg: "bg-gold-500/[0.04]" },
  error: { icon: Ban, text: "text-blood-400", border: "border-l-blood-500/70", bg: "bg-blood-500/[0.06]" },
  debug: { icon: Bug, text: "text-parchment-300/40", border: "border-l-stone-600", bg: "" },
};

export default function Logs() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState<LevelFilter>("all");
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const notifications = useNotifications();

  React.useEffect(() => {
    logsApi.getLogs().then((l) => {
      setLogs(l);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      logsApi.pollNewLogs().then(setLogs);
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoRefresh]);

  const filtered = logs.filter((l) => {
    if (level !== "all" && l.level !== level) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.message.toLowerCase().includes(q) && !l.source.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warningCount = logs.filter((l) => l.level === "warning").length;

  async function handleExport() {
    const blob = await logsApi.exportLogs();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `palworld-server-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notifications.success({ title: "Logs exported", message: "The chronicle has been copied to a scroll." });
  }

  return (
    <div className="space-y-6">
      <ScrollPanel
        icon={<ScrollText />}
        title="The Chronicle"
        actions={
          <RuneButton variant="gold" size="sm" icon={<Download />} onClick={handleExport}>
            Export
          </RuneButton>
        }
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-300/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="pl-9"
              />
            </div>
            <AncientTabs value={level} onValueChange={(v) => setLevel(v as LevelFilter)}>
              <AncientTabsList>
                <AncientTabsTrigger value="all">All</AncientTabsTrigger>
                <AncientTabsTrigger value="info">Info</AncientTabsTrigger>
                <AncientTabsTrigger value="warning">
                  Warnings{warningCount > 0 && <span className="ml-1 text-gold-500">({warningCount})</span>}
                </AncientTabsTrigger>
                <AncientTabsTrigger value="error">
                  Errors{errorCount > 0 && <span className="ml-1 text-blood-400">({errorCount})</span>}
                </AncientTabsTrigger>
                <AncientTabsTrigger value="debug">Debug</AncientTabsTrigger>
              </AncientTabsList>
            </AncientTabs>
          </div>
          <EnchantedToggle
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
            label="Auto-refresh"
            className="w-fit"
          />
        </div>

        <ScrollArea className="h-[520px] rounded-md border border-stone-700 bg-abyss-950/60">
          {loading ? (
            <div className="flex h-full items-center justify-center text-parchment-300/50">
              <p className="animate-pulse font-display">Unfurling the scroll...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-parchment-300/40">
              <p>No entries match your search.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-800/80 font-mono text-[13px]">
              {filtered.map((entry) => {
                const config = LEVEL_CONFIG[entry.level];
                const Icon = config.icon;
                return (
                  <div
                    key={entry.id}
                    className={cn("flex items-start gap-3 border-l-2 px-4 py-2", config.border, config.bg)}
                  >
                    <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", config.text)} />
                    <span className="shrink-0 text-parchment-300/35">{formatTimestamp(entry.timestamp)}</span>
                    <span className="shrink-0 rounded bg-stone-800/80 px-1.5 py-0.5 text-[11px] text-parchment-300/50">
                      {entry.source}
                    </span>
                    <span className={cn("min-w-0 flex-1 break-words", config.text || "text-parchment-200")}>
                      {entry.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </ScrollPanel>
    </div>
  );
}
