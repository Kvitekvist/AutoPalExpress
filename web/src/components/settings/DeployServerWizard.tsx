import * as React from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, RotateCcw } from "lucide-react";
import { instancesApi } from "@/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { SpaceInvadersGame } from "@/components/fantasy/SpaceInvadersGame";
import { useNotifications } from "@/hooks/useNotifications";

interface DeployServerWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeployed: () => void;
}

type WizardStatus = "idle" | "running" | "done" | "error";

export function DeployServerWizard({ open, onOpenChange, onDeployed }: DeployServerWizardProps) {
  const { t } = useTranslation();
  const [name, setName] = React.useState("");
  const [gamePort, setGamePort] = React.useState(8211);
  const [rconPort, setRconPort] = React.useState(8212);
  const [maxPlayers, setMaxPlayers] = React.useState(32);
  const [installParentDir, setInstallParentDir] = React.useState("");
  const [defaultLocation, setDefaultLocation] = React.useState<string | null>(null);
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
      setInstallParentDir("");
      return;
    }
    instancesApi
      .getDefaultDeployLocation()
      .then((data) => setDefaultLocation(data.path))
      .catch(() => setDefaultLocation(null));
  }, [open]);

  React.useEffect(() => {
    if (!jobId || status !== "running") return;
    const interval = setInterval(async () => {
      const job = await instancesApi.getDeployStatus(jobId);
      setLog(job.log);
      if (job.status === "done") {
        setStatus("done");
        notifications.success({
          title: t("settings.deploy.deployedTitle", { defaultValue: "Server deployed" }),
          message: t("settings.deploy.deployedMessage", { defaultValue: "{{name}} is ready.", name }),
        });
        onDeployed();
      } else if (job.status === "error") {
        setStatus("error");
        setError(job.error);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, status, name, notifications, onDeployed, t]);

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
        installParentDir: installParentDir.trim() || null,
      });
      setJobId(id);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : t("settings.deploy.startFailedFallback", { defaultValue: "Couldn't start the deploy." }));
    }
  }

  function handleClose(next: boolean) {
    if (!next && status === "running") return; // don't let them close mid-deploy
    onOpenChange(next);
  }

  async function handleBrowseInstallLocation() {
    setError(null);
    try {
      const { path } = await instancesApi.browseDeployParentDir();
      if (path) setInstallParentDir(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.deploy.folderPickerFailedFallback", { defaultValue: "Couldn't open the folder picker." }));
    }
  }

  const canSubmit = !!name.trim() && status === "idle";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.deploy.title", { defaultValue: "Deploy a New Server" })}</DialogTitle>
          <DialogDescription>
            {t("settings.deploy.description", {
              defaultValue:
                "Installs a fresh, fully isolated Palworld Dedicated Server via SteamCMD - its own folder, mods, and ports, so it can't conflict with any other server this tool manages. This downloads the server fresh from Steam, so it can take a few minutes - longer on a slower connection.",
            })}
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="deploy-name">{t("settings.deploy.serverName", { defaultValue: "Server Name" })}</Label>
              <Input
                id="deploy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.deploy.serverNamePlaceholder", { defaultValue: "My Cozy Palworld" })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deploy-port">{t("settings.deploy.gamePort", { defaultValue: "Game Port" })}</Label>
                <Input
                  id="deploy-port"
                  type="number"
                  value={gamePort}
                  onChange={(e) => setGamePort(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deploy-rcon">{t("settings.deploy.restApiPort", { defaultValue: "REST API Port" })}</Label>
                <Input
                  id="deploy-rcon"
                  type="number"
                  value={rconPort}
                  onChange={(e) => setRconPort(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deploy-max">{t("settings.deploy.maxPlayers", { defaultValue: "Max Players" })}</Label>
                <Input
                  id="deploy-max"
                  type="number"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deploy-location">{t("settings.deploy.installLocation", { defaultValue: "Server Deployment Location" })}</Label>
              <div className="flex gap-2">
                <Input
                  id="deploy-location"
                  value={installParentDir || t("settings.deploy.defaultFolder", { defaultValue: "Default AutoPalExpress servers folder" })}
                  readOnly
                  className="flex-1"
                />
                {installParentDir && (
                  <RuneButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw />}
                    onClick={() => setInstallParentDir("")}
                  >
                    {t("settings.deploy.default", { defaultValue: "Default" })}
                  </RuneButton>
                )}
                <RuneButton type="button" variant="ghost" size="sm" icon={<FolderOpen />} onClick={handleBrowseInstallLocation}>
                  {t("settings.deploy.browse", { defaultValue: "Browse" })}
                </RuneButton>
              </div>
              {!installParentDir && defaultLocation && (
                <p className="truncate font-mono text-[11px] text-parchment-300/40">
                  {t("settings.deploy.defaultLocationValue", { defaultValue: "Default: {{path}}", path: defaultLocation })}
                </p>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-parchment-300/40">
              {t("settings.deploy.hint", {
                defaultValue:
                  "AutoPalExpress creates a server folder named after this server inside the selected location. Each server needs its own Game/REST API ports if you plan to run more than one at the same time.",
              })}
            </p>
          </div>
        )}

        {status !== "idle" && (
          <div className="space-y-3">
            {status === "running" && (
              <SpaceInvadersGame
                shipStyle="squid"
                caption={t("settings.deploy.waitGameCaption", { defaultValue: "Use ← → and Space while your server downloads..." })}
              />
            )}
            <div className="h-48 overflow-y-auto rounded-md border border-stone-700 bg-abyss-950/60 p-3 font-mono text-[11px] leading-relaxed text-parchment-300/70">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              <div ref={logEndRef} />
            </div>
            {status === "running" && <p className="animate-pulse text-xs text-gold-400">{t("settings.deploy.deploying", { defaultValue: "Deploying..." })}</p>}
            {status === "done" && <p className="text-xs text-life-400">{t("settings.deploy.done", { defaultValue: "Done - the new server is now active." })}</p>}
            {status === "error" && <p className="text-xs text-blood-400">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {status === "idle" && (
            <>
              <RuneButton variant="ghost" onClick={() => onOpenChange(false)}>
                {t("settings.deploy.cancel", { defaultValue: "Cancel" })}
              </RuneButton>
              <RuneButton variant="gold" onClick={handleDeploy} disabled={!canSubmit}>
                {t("settings.deploy.deploy", { defaultValue: "Deploy" })}
              </RuneButton>
            </>
          )}
          {status === "running" && (
            <RuneButton variant="ghost" disabled>
              {t("settings.deploy.deploying", { defaultValue: "Deploying..." })}
            </RuneButton>
          )}
          {(status === "done" || status === "error") && (
            <RuneButton variant="gold" onClick={() => onOpenChange(false)}>
              {t("settings.deploy.close", { defaultValue: "Close" })}
            </RuneButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
