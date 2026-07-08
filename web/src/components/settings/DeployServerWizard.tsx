import * as React from "react";
import { instancesApi } from "@/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

interface DeployServerWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeployed: () => void;
}

type WizardStatus = "idle" | "running" | "done" | "error";

export function DeployServerWizard({ open, onOpenChange, onDeployed }: DeployServerWizardProps) {
  const [name, setName] = React.useState("");
  const [gamePort, setGamePort] = React.useState(8211);
  const [rconPort, setRconPort] = React.useState(8212);
  const [maxPlayers, setMaxPlayers] = React.useState(32);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<WizardStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const notifications = useNotifications();
  const logEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {
      setJobId(null);
      setLog([]);
      setStatus("idle");
      setError(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!jobId || status !== "running") return;
    const interval = setInterval(async () => {
      const job = await instancesApi.getDeployStatus(jobId);
      setLog(job.log);
      if (job.status === "done") {
        setStatus("done");
        notifications.success({ title: "Server deployed", message: `${name} is ready.` });
        onDeployed();
      } else if (job.status === "error") {
        setStatus("error");
        setError(job.error);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, status, name, notifications, onDeployed]);

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  async function handleDeploy() {
    setStatus("running");
    setError(null);
    setLog([]);
    try {
      const { jobId: id } = await instancesApi.deploy({
        name: name.trim(),
        gamePort,
        rconPort,
        maxPlayers,
      });
      setJobId(id);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Couldn't start the deploy.");
    }
  }

  function handleClose(next: boolean) {
    if (!next && status === "running") return; // don't let them close mid-deploy
    onOpenChange(next);
  }

  const canSubmit = !!name.trim() && status === "idle";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deploy a New Server</DialogTitle>
          <DialogDescription>
            Installs a fresh, fully isolated Palworld Dedicated Server via SteamCMD - its own folder, mods, and
            ports, so it can't conflict with any other server this tool manages. Stored under this tool's own
            "servers" folder, named after whatever you type below.
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="deploy-name">Server Name</Label>
              <Input
                id="deploy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Cozy Palworld"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deploy-port">Game Port</Label>
                <Input
                  id="deploy-port"
                  type="number"
                  value={gamePort}
                  onChange={(e) => setGamePort(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deploy-rcon">REST API Port</Label>
                <Input
                  id="deploy-rcon"
                  type="number"
                  value={rconPort}
                  onChange={(e) => setRconPort(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deploy-max">Max Players</Label>
                <Input
                  id="deploy-max"
                  type="number"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                />
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-parchment-300/40">
              Each server needs its own Game/REST API ports if you plan to run more than one at the same time. This
              downloads the server fresh from Steam (a few gigabytes), so it can take a while depending on your
              connection.
            </p>
          </div>
        )}

        {status !== "idle" && (
          <div className="space-y-3">
            <div className="h-48 overflow-y-auto rounded-md border border-stone-700 bg-abyss-950/60 p-3 font-mono text-[11px] leading-relaxed text-parchment-300/70">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              <div ref={logEndRef} />
            </div>
            {status === "running" && <p className="animate-pulse text-xs text-gold-400">Deploying...</p>}
            {status === "done" && <p className="text-xs text-life-400">Done - the new server is now active.</p>}
            {status === "error" && <p className="text-xs text-blood-400">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {status === "idle" && (
            <>
              <RuneButton variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </RuneButton>
              <RuneButton variant="gold" onClick={handleDeploy} disabled={!canSubmit}>
                Deploy
              </RuneButton>
            </>
          )}
          {status === "running" && (
            <RuneButton variant="ghost" disabled>
              Deploying...
            </RuneButton>
          )}
          {(status === "done" || status === "error") && (
            <RuneButton variant="gold" onClick={() => onOpenChange(false)}>
              Close
            </RuneButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
