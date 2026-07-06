import * as React from "react";
import { Radar, Wifi, WifiOff, Lock, Users, TriangleAlert } from "lucide-react";
import { connectionApi } from "@/api";
import type { ServerConnection, DiscoveredServer } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function ServerConnectionPanel() {
  const [connection, setConnection] = React.useState<ServerConnection | null>(null);
  const [host, setHost] = React.useState("");
  const [port, setPort] = React.useState(8212);
  const [adminPassword, setAdminPassword] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [scanOpen, setScanOpen] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [discovered, setDiscovered] = React.useState<DiscoveredServer[]>([]);

  const notifications = useNotifications();

  React.useEffect(() => {
    connectionApi.getConnection().then((c) => {
      setConnection(c);
      setHost(c.host);
      setPort(c.port);
      setAdminPassword(c.adminPassword);
    });
  }, []);

  async function handleTest() {
    setTesting(true);
    setError(null);
    try {
      const c = await connectionApi.testConnection({ host, port, adminPassword });
      setConnection(c);
      notifications.success({
        title: "Connection established",
        message: `Linked to ${c.host}:${c.port}.`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to connect to the server.";
      setError(message);
      notifications.error({ title: "Connection failed", message });
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    const c = await connectionApi.disconnectServer();
    setConnection(c);
    notifications.info({ title: "Disconnected", message: "No longer linked to a Palworld server." });
  }

  async function handleScan() {
    setScanOpen(true);
    setScanning(true);
    setDiscovered([]);
    const results = await connectionApi.scanLan();
    setDiscovered(results);
    setScanning(false);
  }

  function pickDiscovered(server: DiscoveredServer) {
    setHost(server.host);
    setPort(server.port);
    setScanOpen(false);
    notifications.info({
      title: "Server selected",
      message: `${server.serverName} filled in. Enter the admin password and test the connection.`,
    });
  }

  const isConnected = connection?.connected;

  return (
    <ScrollPanel icon={<Wifi />} title="Server Connection">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-700 bg-abyss-900/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {isConnected ? (
            <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-life-400 shadow-[0_0_8px_2px_rgba(79,206,124,0.7)] animate-glow-pulse" />
          ) : (
            <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-stone-500" />
          )}
          <p className={cn("text-sm font-medium", isConnected ? "text-life-400" : "text-parchment-300/50")}>
            {isConnected
              ? connection?.serverName
                ? `Connected: ${connection.serverName} (${connection.serverVersion})`
                : `Connected: ${connection?.host}:${connection?.port}`
              : "Not connected"}
          </p>
        </div>
        {isConnected && (
          <RuneButton variant="ghost" size="sm" icon={<WifiOff />} onClick={handleDisconnect}>
            Disconnect
          </RuneButton>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="conn-host">Host / IP Address</Label>
          <Input id="conn-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conn-port">Port</Label>
          <Input
            id="conn-port"
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            placeholder="8212"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="conn-password">Admin Password</Label>
          <Input
            id="conn-password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Matches AdminPassword in PalWorldSettings.ini"
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-blood-600/30 bg-blood-500/5 px-3 py-2 text-xs text-blood-400">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <RuneButton variant="gold" onClick={handleTest} disabled={testing}>
          {testing ? "Testing..." : "Test Connection"}
        </RuneButton>
        <RuneButton variant="mana" icon={<Radar />} onClick={handleScan} disabled={testing}>
          Scan Local Network
        </RuneButton>
        <p className="text-xs text-parchment-300/40">
          Uses the server's built-in REST API (Palworld Settings &rarr; RESTAPIEnabled).
        </p>
      </div>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Servers on Your Network</DialogTitle>
            <DialogDescription>Select a discovered server to fill in its host and port.</DialogDescription>
          </DialogHeader>
          {scanning ? (
            <div className="flex h-32 items-center justify-center text-parchment-300/50">
              <p className="animate-pulse font-display">Scrying the local network...</p>
            </div>
          ) : discovered.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-parchment-300/40">
              <p>No servers found on this network.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {discovered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickDiscovered(s)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-stone-700 bg-abyss-900/40 px-4 py-3 text-left transition-colors hover:border-gold-500/50 hover:bg-gold-500/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-parchment-100">{s.serverName}</p>
                    <p className="font-mono text-xs text-parchment-300/50">
                      {s.host}:{s.port} &middot; {s.version}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-parchment-300/60">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {s.playersOnline}/{s.maxPlayers}
                    </span>
                    {s.requiresPassword && <Lock className="h-3.5 w-3.5 text-gold-500/70" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ScrollPanel>
  );
}
