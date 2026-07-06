import * as React from "react";
import { Play, Square, RotateCw, Save, Megaphone, TimerOff, Ban, ChevronDown } from "lucide-react";
import { serverApi, instancesApi } from "@/api";
import type { InstanceListView } from "@/types/models";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useNotifications } from "@/hooks/useNotifications";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { CrystalStatus } from "@/components/fantasy/CrystalStatus";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Action = "start" | "stop" | "restart" | "save" | null;

const COUNTDOWN_PRESETS = [30, 60, 120, 300];

function StartServerControl({
  disabled,
  busy,
  onStart,
}: {
  disabled: boolean;
  busy: boolean;
  onStart: () => void;
}) {
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
                Change <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {data.instances.map((instance) => (
                <DropdownMenuItem key={instance.id} onSelect={() => handleSwitch(instance.id)}>
                  {instance.id === data.activeId ? "✓ " : ""}
                  {instance.name} &middot; port {instance.gamePort}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <button type="button" onClick={onStart} disabled={disabled || busy || switching} className="flex flex-col items-center gap-1">
        <Play className="h-7 w-7" />
        <span className="text-sm">{busy ? "Working..." : "Start Server"}</span>
        <span className="max-w-[10rem] truncate text-[10px] font-sans normal-case tracking-normal text-parchment-300/50">
          {active ? `${active.name} · port ${active.gamePort}` : "No server selected"}
        </span>
      </button>
    </div>
  );
}

export default function ServerControl() {
  const { status, refresh, setStatus } = useServerStatus(4000);
  const notifications = useNotifications();

  const [busyAction, setBusyAction] = React.useState<Action>(null);
  const [confirmAction, setConfirmAction] = React.useState<"stop" | "restart" | null>(null);

  const [broadcastOpen, setBroadcastOpen] = React.useState(false);
  const [broadcastText, setBroadcastText] = React.useState("");
  const [broadcasting, setBroadcasting] = React.useState(false);

  const [shutdownOpen, setShutdownOpen] = React.useState(false);
  const [shutdownSeconds, setShutdownSeconds] = React.useState(60);
  const [countdown, setCountdown] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      serverApi.stopServer().then((s) => {
        setStatus(s);
        notifications.error({ title: "Server has gone dark", message: "The shutdown countdown reached zero." });
      });
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [countdown, notifications, setStatus]);

  const isOnline = status?.state === "online";
  const isTransitioning = status?.state === "starting" || status?.state === "stopping" || status?.state === "restarting";

  async function handleStart() {
    setBusyAction("start");
    try {
      const s = await serverApi.startServer();
      setStatus(s);
      notifications.success({ title: "Server ignited", message: "The realm awakens once more." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStop() {
    setBusyAction("stop");
    try {
      const s = await serverApi.stopServer();
      setStatus(s);
      notifications.warning({ title: "Server extinguished", message: "The realm has gone quiet." });
    } finally {
      setBusyAction(null);
      setConfirmAction(null);
    }
  }

  async function handleRestart() {
    setBusyAction("restart");
    try {
      const s = await serverApi.restartServer();
      setStatus(s);
      notifications.success({ title: "Server restarted", message: "The realm has been reforged anew." });
    } finally {
      setBusyAction(null);
      setConfirmAction(null);
    }
  }

  async function handleSave() {
    setBusyAction("save");
    try {
      await serverApi.saveWorld();
      await refresh();
      notifications.success({ title: "World saved", message: "Your realm's fate has been etched into stone." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleBroadcast() {
    if (!broadcastText.trim()) return;
    setBroadcasting(true);
    try {
      await serverApi.broadcastMessage(broadcastText.trim());
      notifications.info({ title: "Message broadcast", message: "Your words echo across the realm." });
      setBroadcastOpen(false);
      setBroadcastText("");
    } finally {
      setBroadcasting(false);
    }
  }

  async function handleStartCountdown() {
    await serverApi.startShutdownCountdown(shutdownSeconds);
    setCountdown(shutdownSeconds);
    setShutdownOpen(false);
    notifications.warning({ title: "Shutdown countdown started", message: `The server will fall silent in ${shutdownSeconds}s.` });
  }

  async function handleCancelCountdown() {
    await serverApi.cancelShutdownCountdown();
    setCountdown(null);
    notifications.info({ title: "Countdown cancelled", message: "The realm's fate has been spared, for now." });
  }

  return (
    <div className="space-y-6">
      <ScrollPanel>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CrystalStatus state={status?.state ?? "offline"} size="lg" />
          <div>
            <p className="font-display text-lg font-semibold capitalize text-parchment-100">
              {status?.state ?? "unknown"}
            </p>
            <p className="text-xs text-parchment-300/50">
              {isOnline ? "The realm is alive and well." : isTransitioning ? "The realm is shifting states..." : "The realm slumbers."}
            </p>
          </div>
          {countdown !== null && (
            <div className="flex items-center gap-3 rounded-lg border border-blood-500/50 bg-blood-500/10 px-5 py-3 shadow-rune-blood">
              <TimerOff className="h-5 w-5 text-blood-400 animate-glow-pulse" />
              <p className="font-display text-lg font-bold text-blood-400">
                Shutting down in {countdown}s
              </p>
              <RuneButton variant="ghost" size="sm" icon={<Ban />} onClick={handleCancelCountdown}>
                Cancel
              </RuneButton>
            </div>
          )}
        </div>
      </ScrollPanel>

      <ScrollPanel title="Rites of Command">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StartServerControl disabled={isOnline || isTransitioning} busy={busyAction === "start"} onStart={handleStart} />
          <ActionButton
            icon={<Square />}
            label="Stop Server"
            variant="danger"
            disabled={!isOnline}
            loading={busyAction === "stop"}
            onClick={() => setConfirmAction("stop")}
          />
          <ActionButton
            icon={<RotateCw />}
            label="Restart Server"
            variant="gold"
            disabled={!isOnline}
            loading={busyAction === "restart"}
            onClick={() => setConfirmAction("restart")}
          />
          <ActionButton
            icon={<Save />}
            label="Save World"
            variant="mana"
            disabled={!isOnline}
            loading={busyAction === "save"}
            onClick={handleSave}
          />
          <ActionButton
            icon={<Megaphone />}
            label="Broadcast Message"
            variant="arcane"
            disabled={!isOnline}
            onClick={() => setBroadcastOpen(true)}
          />
          <ActionButton
            icon={<TimerOff />}
            label="Shutdown Countdown"
            variant="danger"
            disabled={!isOnline || countdown !== null}
            onClick={() => setShutdownOpen(true)}
          />
        </div>
      </ScrollPanel>

      <RuneDialog
        open={confirmAction === "stop"}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        tone="danger"
        title="Stop the server?"
        description="All connected players will be disconnected immediately. This cannot be undone remotely once offline."
        confirmLabel="Stop Server"
        onConfirm={handleStop}
        confirming={busyAction === "stop"}
      />

      <RuneDialog
        open={confirmAction === "restart"}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        tone="warning"
        title="Restart the server?"
        description="The server will briefly go offline while it restarts. Connected players will be disconnected."
        confirmLabel="Restart Server"
        onConfirm={handleRestart}
        confirming={busyAction === "restart"}
      />

      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast a Message</DialogTitle>
            <DialogDescription>Sent instantly to every player currently in the realm.</DialogDescription>
          </DialogHeader>
          <Input
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="Type your announcement..."
            autoFocus
          />
          <DialogFooter>
            <RuneButton variant="ghost" onClick={() => setBroadcastOpen(false)} disabled={broadcasting}>
              Cancel
            </RuneButton>
            <RuneButton variant="arcane" onClick={handleBroadcast} disabled={broadcasting || !broadcastText.trim()}>
              {broadcasting ? "Sending..." : "Broadcast"}
            </RuneButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shutdownOpen} onOpenChange={setShutdownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Begin Shutdown Countdown</DialogTitle>
            <DialogDescription>
              Choose how long until the server shuts down. Players will remain connected until the countdown ends.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {COUNTDOWN_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setShutdownSeconds(s)}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  shutdownSeconds === s
                    ? "border-blood-500/60 bg-blood-500/10 text-blood-400"
                    : "border-stone-600 text-parchment-300/60 hover:border-blood-500/40"
                )}
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>
          <DialogFooter>
            <RuneButton variant="ghost" onClick={() => setShutdownOpen(false)}>
              Cancel
            </RuneButton>
            <RuneButton variant="danger" onClick={handleStartCountdown}>
              Begin Countdown
            </RuneButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  variant: "gold" | "arcane" | "mana" | "life" | "danger";
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

function ActionButton({ icon, label, variant, disabled, loading, onClick }: ActionButtonProps) {
  return (
    <RuneButton
      variant={variant}
      size="lg"
      onClick={onClick}
      disabled={disabled || loading}
      className="h-24 w-full flex-col gap-2 text-sm"
    >
      <span className="[&_svg]:h-7 [&_svg]:w-7">{icon}</span>
      {loading ? "Working..." : label}
    </RuneButton>
  );
}
