import * as React from "react";
import { Link } from "react-router-dom";
import { Cpu, MemoryStick, Gauge, Users, Tag, BookOpen, Map, Save, TriangleAlert } from "lucide-react";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { CrystalStatus } from "@/components/fantasy/CrystalStatus";
import { StatTile } from "@/components/fantasy/StatTile";
import { ManaProgressBar } from "@/components/fantasy/ManaProgressBar";
import { PlayersSection } from "@/components/players/PlayersSection";
import { useServerStatus } from "@/hooks/useServerStatus";
import { modsApi, instancesApi } from "@/api";
import type { ServerInstance } from "@/types/models";
import { formatUptime, formatRelativeTime } from "@/lib/format";

export default function Dashboard() {
  const { status, loading } = useServerStatus(4000);
  const [modCount, setModCount] = React.useState<number | null>(null);
  const [instance, setInstance] = React.useState<ServerInstance | null>(null);

  React.useEffect(() => {
    modsApi.getMods().then((mods) => setModCount(mods.length));
    instancesApi.getActive().then(setInstance);
  }, []);

  if (loading || !status) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="animate-pulse font-display">Consulting the crystal ball...</p>
      </div>
    );
  }

  const ramPercent = status.ramTotalGB > 0 ? (status.ramUsedGB / status.ramTotalGB) * 100 : 0;
  const tickHealth =
    status.tickRateMs !== null && status.targetTickRateMs > 0
      ? Math.max(0, 100 - Math.abs(status.tickRateMs - status.targetTickRateMs) * 4)
      : 0;
  const playersPercent = status.maxPlayers > 0 ? (status.playersOnline / status.maxPlayers) * 100 : 0;

  return (
    <div className="space-y-6">
      {!instance && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-gold-600/30 bg-gold-500/5 px-4 py-3 text-xs text-gold-300">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <span>No server is set up yet.</span>
          <Link to="/settings" className="ml-auto font-semibold underline decoration-dotted underline-offset-2 hover:text-gold-200">
            Deploy or import one in Settings
          </Link>
        </div>
      )}

      <ScrollPanel>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <CrystalStatus state={status.state} size="lg" label={status.state} />
          <div className="grid w-full grid-cols-2 gap-x-8 gap-y-3 text-sm sm:w-auto sm:grid-cols-3">
            <div className="flex items-center gap-2 text-parchment-300/70">
              <Map className="h-4 w-4 text-gold-500/70" />
              <span>
                Map: <span className="text-parchment-100">{status.map || "-"}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-parchment-300/70">
              <Gauge className="h-4 w-4 text-gold-500/70" />
              <span>
                Uptime: <span className="text-parchment-100">{formatUptime(status.uptimeSeconds)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-parchment-300/70">
              <Save className="h-4 w-4 text-gold-500/70" />
              <span>
                Last saved:{" "}
                <span className="text-parchment-100">
                  {status.lastSavedAt ? formatRelativeTime(status.lastSavedAt) : "Never"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </ScrollPanel>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={<Cpu />}
          label="CPU"
          value={`${Math.round(status.cpuPercent)}%`}
          accent="arcane"
        >
          <ManaProgressBar value={status.cpuPercent} variant="arcane" className="mt-3" />
        </StatTile>

        <StatTile
          icon={<MemoryStick />}
          label="RAM"
          value={`${status.ramUsedGB.toFixed(1)} GB`}
          hint={`of ${status.ramTotalGB} GB`}
          accent="mana"
        >
          <ManaProgressBar value={ramPercent} variant="mana" className="mt-3" />
        </StatTile>

        <StatTile
          icon={<Gauge />}
          label="Tick Rate"
          value={status.tickRateMs === null ? "-" : `${status.tickRateMs.toFixed(0)} ms`}
          hint={status.targetTickRateMs > 0 ? `target ${status.targetTickRateMs} ms` : "REST metric unavailable"}
          accent="gold"
        >
          <ManaProgressBar value={tickHealth} variant="gold" className="mt-3" />
        </StatTile>

        <StatTile
          icon={<Users />}
          label="Players"
          value={`${status.playersOnline}/${status.maxPlayers}`}
          accent="life"
        >
          <ManaProgressBar value={playersPercent} variant="life" className="mt-3" />
        </StatTile>

        <StatTile
          icon={<Tag />}
          label="Version"
          value={<span className="block truncate text-lg">{status.serverVersion || "-"}</span>}
          accent="gold"
          hint="Server build"
        />

        <StatTile
          icon={<BookOpen />}
          label="Mods"
          value={modCount ?? "-"}
          accent="arcane"
          hint="Installed enchantments"
        />
      </div>

      <PlayersSection />
    </div>
  );
}
