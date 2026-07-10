import * as React from "react";
import { useTranslation } from "react-i18next";
import { Play, Square, RotateCw, Save, Megaphone, TimerOff, Ban, ChevronDown, DownloadCloud } from "lucide-react";
import { serverApi, instancesApi } from "@/api";
import type { InstanceListView, ServerUpdateCheck, ServerUpdateJob } from "@/types/models";
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

type Action = "start" | "stop" | "restart" | "save" | "check-update" | "update" | null;

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
  const { t } = useTranslation();
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
                {t("serverControl.change", { defaultValue: "Change" })} <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {data.instances.map((instance) => (
                <DropdownMenuItem key={instance.id} onSelect={() => handleSwitch(instance.id)}>
                  {instance.id === data.activeId ? "✓ " : ""}
                  {t("serverControl.nameAndPort", { defaultValue: "{{name}} · port {{port}}", name: instance.name, port: instance.gamePort })}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <button type="button" onClick={onStart} disabled={disabled || busy || switching} className="flex flex-col items-center gap-1">
        <Play className="h-7 w-7" />
        <span className="text-sm">{busy ? t("serverControl.working", { defaultValue: "Working..." }) : t("serverControl.startServer", { defaultValue: "Start Server" })}</span>
        <span className="max-w-[10rem] truncate text-[10px] font-sans normal-case tracking-normal text-parchment-300/50">
          {active
            ? t("serverControl.nameAndPort", { defaultValue: "{{name}} · port {{port}}", name: active.name, port: active.gamePort })
            : t("serverControl.noServerSelected", { defaultValue: "No server selected" })}
        </span>
      </button>
    </div>
  );
}

export default function ServerControl() {
  const { t } = useTranslation();
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
  const [updateCheck, setUpdateCheck] = React.useState<ServerUpdateCheck | null>(null);
  const [updateConfirmOpen, setUpdateConfirmOpen] = React.useState(false);
  const [updateJobId, setUpdateJobId] = React.useState<string | null>(null);
  const [updateJob, setUpdateJob] = React.useState<ServerUpdateJob | null>(null);

  React.useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      serverApi.stopServer().then((s) => {
        setStatus(s);
        notifications.error({
          title: t("serverControl.notifications.wentDarkTitle", { defaultValue: "Server has gone dark" }),
          message: t("serverControl.notifications.wentDarkMessage", { defaultValue: "The shutdown countdown reached zero." }),
        });
      });
      return;
    }
    const timeoutId = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [countdown, notifications, setStatus, t]);

  const isOnline = status?.state === "online";
  const isTransitioning = status?.state === "starting" || status?.state === "stopping" || status?.state === "restarting";
  const updateRunning = updateJob?.status === "running" || busyAction === "update";

  React.useEffect(() => {
    if (!updateJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const job = await serverApi.getServerUpdateJob(updateJobId);
        if (cancelled) return;
        setUpdateJob(job);
        if (job.status === "done") {
          setBusyAction(null);
          setUpdateJobId(null);
          notifications.success({
            title: t("serverControl.notifications.serverUpdatedTitle", { defaultValue: "Server updated" }),
            message: job.installedBuildId
              ? t("serverControl.notifications.installedBuild", { defaultValue: "Installed build {{id}}.", id: job.installedBuildId })
              : t("serverControl.notifications.updateFinished", { defaultValue: "SteamCMD finished the update." }),
          });
          await refresh();
        } else if (job.status === "error") {
          setBusyAction(null);
          setUpdateJobId(null);
          notifications.error({
            title: t("serverControl.notifications.updateFailedTitle", { defaultValue: "Update failed" }),
            message: job.error ?? t("serverControl.notifications.updateFailedFallback", { defaultValue: "SteamCMD could not update the server." }),
          });
        }
      } catch (e) {
        if (!cancelled) {
          setBusyAction(null);
          setUpdateJobId(null);
          notifications.error({
            title: t("serverControl.notifications.updateStatusFailedTitle", { defaultValue: "Update status failed" }),
            message: e instanceof Error ? e.message : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
          });
        }
      }
    };
    poll();
    const timer = window.setInterval(poll, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [updateJobId, notifications, refresh, t]);

  async function handleStart() {
    setBusyAction("start");
    try {
      const s = await serverApi.startServer();
      setStatus(s);
      notifications.success({
        title: t("serverControl.notifications.ignitedTitle", { defaultValue: "Server ignited" }),
        message: t("serverControl.notifications.ignitedMessage", { defaultValue: "The realm awakens once more." }),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStop() {
    setBusyAction("stop");
    try {
      const s = await serverApi.stopServer();
      setStatus(s);
      notifications.warning({
        title: t("serverControl.notifications.extinguishedTitle", { defaultValue: "Server extinguished" }),
        message: t("serverControl.notifications.extinguishedMessage", { defaultValue: "The realm has gone quiet." }),
      });
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
      notifications.success({
        title: t("serverControl.notifications.restartedTitle", { defaultValue: "Server restarted" }),
        message: t("serverControl.notifications.restartedMessage", { defaultValue: "The realm has been reforged anew." }),
      });
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
      notifications.success({
        title: t("serverControl.notifications.savedTitle", { defaultValue: "World saved" }),
        message: t("serverControl.notifications.savedMessage", { defaultValue: "Your realm's fate has been etched into stone." }),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckUpdate() {
    setBusyAction("check-update");
    try {
      const check = await serverApi.checkServerUpdate();
      setUpdateCheck(check);
      if (check.updateAvailable) {
        setUpdateConfirmOpen(true);
      } else if (check.canCompare) {
        notifications.success({
          title: t("serverControl.notifications.upToDateTitle", { defaultValue: "Server is up to date" }),
          message: check.installedBuildId
            ? t("serverControl.notifications.installedBuild", { defaultValue: "Installed build {{id}}.", id: check.installedBuildId })
            : undefined,
        });
      } else {
        notifications.warning({
          title: t("serverControl.notifications.couldNotCompareTitle", { defaultValue: "Could not compare builds" }),
          message: t("serverControl.notifications.couldNotCompareMessage", {
            defaultValue: "SteamCMD responded, but the installed or latest build id was not available.",
          }),
        });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateServer() {
    if (isOnline) {
      notifications.warning({
        title: t("serverControl.notifications.stopFirstTitle", { defaultValue: "Stop the server first" }),
        message: t("serverControl.notifications.stopFirstMessage", { defaultValue: "Updates can only run while the server is offline." }),
      });
      return;
    }
    setBusyAction("update");
    try {
      const job = await serverApi.startServerUpdate();
      setUpdateJobId(job.jobId);
      setUpdateJob({
        status: "running",
        log: [t("serverControl.notifications.startingUpdateLog", { defaultValue: "Starting SteamCMD update..." })],
        error: null,
        installedBuildId: null,
        latestBuildId: null,
      });
      setUpdateConfirmOpen(false);
      notifications.info({
        title: t("serverControl.notifications.updateStartedTitle", { defaultValue: "Update started" }),
        message: t("serverControl.notifications.updateStartedMessage", { defaultValue: "SteamCMD is updating the stopped server." }),
      });
    } catch (e) {
      setBusyAction(null);
      notifications.error({
        title: t("serverControl.notifications.couldNotStartUpdateTitle", { defaultValue: "Could not start update" }),
        message: e instanceof Error ? e.message : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
      });
    }
  }

  async function handleBroadcast() {
    if (!broadcastText.trim()) return;
    setBroadcasting(true);
    try {
      await serverApi.broadcastMessage(broadcastText.trim());
      notifications.info({
        title: t("serverControl.notifications.broadcastTitle", { defaultValue: "Message broadcast" }),
        message: t("serverControl.notifications.broadcastMessage", { defaultValue: "Your words echo across the realm." }),
      });
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
    notifications.warning({
      title: t("serverControl.notifications.countdownStartedTitle", { defaultValue: "Shutdown countdown started" }),
      message: t("serverControl.notifications.countdownStartedMessage", {
        defaultValue: "The server will fall silent in {{seconds}}s.",
        seconds: shutdownSeconds,
      }),
    });
  }

  async function handleCancelCountdown() {
    await serverApi.cancelShutdownCountdown();
    setCountdown(null);
    notifications.info({
      title: t("serverControl.notifications.countdownCancelledTitle", { defaultValue: "Countdown cancelled" }),
      message: t("serverControl.notifications.countdownCancelledMessage", { defaultValue: "The realm's fate has been spared, for now." }),
    });
  }

  return (
    <div className="space-y-6">
      <ScrollPanel>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CrystalStatus state={status?.state ?? "offline"} size="lg" />
          <div>
            <p className="font-display text-lg font-semibold capitalize text-parchment-100">
              {t(`serverControl.states.${status?.state ?? "unknown"}`, { defaultValue: status?.state ?? "unknown" })}
            </p>
            <p className="text-xs text-parchment-300/50">
              {isOnline
                ? t("serverControl.realmAlive", { defaultValue: "The realm is alive and well." })
                : isTransitioning
                  ? t("serverControl.realmShifting", { defaultValue: "The realm is shifting states..." })
                  : t("serverControl.realmSlumbers", { defaultValue: "The realm slumbers." })}
            </p>
          </div>
          {countdown !== null && (
            <div className="flex items-center gap-3 rounded-lg border border-blood-500/50 bg-blood-500/10 px-5 py-3 shadow-rune-blood">
              <TimerOff className="h-5 w-5 text-blood-400 animate-glow-pulse" />
              <p className="font-display text-lg font-bold text-blood-400">
                {t("serverControl.shuttingDownIn", { defaultValue: "Shutting down in {{seconds}}s", seconds: countdown })}
              </p>
              <RuneButton variant="ghost" size="sm" icon={<Ban />} onClick={handleCancelCountdown}>
                {t("serverControl.cancel", { defaultValue: "Cancel" })}
              </RuneButton>
            </div>
          )}
        </div>
      </ScrollPanel>

      <ScrollPanel title={t("serverControl.ritesTitle", { defaultValue: "Rites of Command" })}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StartServerControl disabled={isOnline || isTransitioning} busy={busyAction === "start"} onStart={handleStart} />
          <ActionButton
            icon={<Square />}
            label={t("serverControl.stopServer", { defaultValue: "Stop Server" })}
            variant="danger"
            disabled={!isOnline}
            loading={busyAction === "stop"}
            onClick={() => setConfirmAction("stop")}
          />
          <ActionButton
            icon={<RotateCw />}
            label={t("serverControl.restartServer", { defaultValue: "Restart Server" })}
            variant="gold"
            disabled={!isOnline}
            loading={busyAction === "restart"}
            onClick={() => setConfirmAction("restart")}
          />
          <ActionButton
            icon={<Save />}
            label={t("serverControl.saveWorld", { defaultValue: "Save World" })}
            variant="mana"
            disabled={!isOnline}
            loading={busyAction === "save"}
            onClick={handleSave}
          />
          <ActionButton
            icon={<DownloadCloud />}
            label={t("serverControl.checkUpdates", { defaultValue: "Check Updates" })}
            variant="life"
            disabled={isTransitioning || updateRunning}
            loading={busyAction === "check-update" || updateRunning}
            onClick={handleCheckUpdate}
          />
          <ActionButton
            icon={<Megaphone />}
            label={t("serverControl.broadcastMessage", { defaultValue: "Broadcast Message" })}
            variant="arcane"
            disabled={!isOnline}
            onClick={() => setBroadcastOpen(true)}
          />
          <ActionButton
            icon={<TimerOff />}
            label={t("serverControl.shutdownCountdown", { defaultValue: "Shutdown Countdown" })}
            variant="danger"
            disabled={!isOnline || countdown !== null}
            onClick={() => setShutdownOpen(true)}
          />
        </div>
      </ScrollPanel>

      {updateJob && (
        <ScrollPanel title={t("serverControl.serverUpdateTitle", { defaultValue: "Server Update" })}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-parchment-300/70">
              <span className="capitalize">
                {t("serverControl.statusLabel", {
                  defaultValue: "Status: {{status}}",
                  status: t(`serverControl.jobStatus.${updateJob.status}`, { defaultValue: updateJob.status }),
                })}
              </span>
              {updateJob.installedBuildId && (
                <span>{t("serverControl.installedBuildShort", { defaultValue: "Installed build {{id}}", id: updateJob.installedBuildId })}</span>
              )}
              {updateJob.latestBuildId && (
                <span>{t("serverControl.latestBuildShort", { defaultValue: "Latest build {{id}}", id: updateJob.latestBuildId })}</span>
              )}
            </div>
            {updateJob.log.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border border-stone-700 bg-abyss-950/60 p-3 font-mono text-[11px] leading-relaxed text-parchment-300/55">
                {updateJob.log.slice(-12).map((line, index) => (
                  <div key={`${index}-${line}`}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </ScrollPanel>
      )}

      <RuneDialog
        open={confirmAction === "stop"}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        tone="danger"
        title={t("serverControl.stopDialog.title", { defaultValue: "Stop the server?" })}
        description={t("serverControl.stopDialog.description", {
          defaultValue: "All connected players will be disconnected immediately. This cannot be undone remotely once offline.",
        })}
        confirmLabel={t("serverControl.stopServer", { defaultValue: "Stop Server" })}
        onConfirm={handleStop}
        confirming={busyAction === "stop"}
      />

      <RuneDialog
        open={confirmAction === "restart"}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        tone="warning"
        title={t("serverControl.restartDialog.title", { defaultValue: "Restart the server?" })}
        description={t("serverControl.restartDialog.description", {
          defaultValue: "The server will briefly go offline while it restarts. Connected players will be disconnected.",
        })}
        confirmLabel={t("serverControl.restartServer", { defaultValue: "Restart Server" })}
        onConfirm={handleRestart}
        confirming={busyAction === "restart"}
      />

      <RuneDialog
        open={updateConfirmOpen}
        onOpenChange={(o) => setUpdateConfirmOpen(o)}
        tone="warning"
        title={t("serverControl.updateDialog.title", { defaultValue: "Update server files?" })}
        description={
          isOnline
            ? t("serverControl.updateDialog.stoppedRequired", {
                defaultValue: "An update is available, but the server must be stopped before AutoPalExpress can update its files.",
              })
            : updateCheck?.latestBuildId
              ? t("serverControl.updateDialog.availableWithBuild", {
                  defaultValue: "Steam reports a newer Palworld Dedicated Server build ({{buildId}}). Update the active server now?",
                  buildId: updateCheck.latestBuildId,
                })
              : t("serverControl.updateDialog.available", {
                  defaultValue: "Steam reports a newer Palworld Dedicated Server build. Update the active server now?",
                })
        }
        confirmLabel={t("serverControl.updateServer", { defaultValue: "Update Server" })}
        onConfirm={handleUpdateServer}
        confirming={busyAction === "update"}
      />

      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("serverControl.broadcastDialog.title", { defaultValue: "Broadcast a Message" })}</DialogTitle>
            <DialogDescription>
              {t("serverControl.broadcastDialog.description", { defaultValue: "Sent instantly to every player currently in the realm." })}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder={t("serverControl.broadcastDialog.placeholder", { defaultValue: "Type your announcement..." })}
            autoFocus
          />
          <DialogFooter>
            <RuneButton variant="ghost" onClick={() => setBroadcastOpen(false)} disabled={broadcasting}>
              {t("serverControl.cancel", { defaultValue: "Cancel" })}
            </RuneButton>
            <RuneButton variant="arcane" onClick={handleBroadcast} disabled={broadcasting || !broadcastText.trim()}>
              {broadcasting
                ? t("serverControl.broadcastDialog.sending", { defaultValue: "Sending..." })
                : t("serverControl.broadcastDialog.send", { defaultValue: "Broadcast" })}
            </RuneButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shutdownOpen} onOpenChange={setShutdownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("serverControl.shutdownDialog.title", { defaultValue: "Begin Shutdown Countdown" })}</DialogTitle>
            <DialogDescription>
              {t("serverControl.shutdownDialog.description", {
                defaultValue: "Choose how long until the server shuts down. Players will remain connected until the countdown ends.",
              })}
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
              {t("serverControl.cancel", { defaultValue: "Cancel" })}
            </RuneButton>
            <RuneButton variant="danger" onClick={handleStartCountdown}>
              {t("serverControl.shutdownDialog.begin", { defaultValue: "Begin Countdown" })}
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
  const { t } = useTranslation();
  return (
    <RuneButton
      variant={variant}
      size="lg"
      onClick={onClick}
      disabled={disabled || loading}
      className="h-24 w-full flex-col gap-2 text-sm"
    >
      <span className="[&_svg]:h-7 [&_svg]:w-7">{icon}</span>
      {loading ? t("serverControl.working", { defaultValue: "Working..." }) : label}
    </RuneButton>
  );
}
