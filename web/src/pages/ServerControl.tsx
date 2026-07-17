import * as React from "react";
import { useTranslation } from "react-i18next";
import { Square, RotateCw, Save, Megaphone, TimerOff, Ban, DownloadCloud } from "lucide-react";
import { serverApi } from "@/api";
import type { ServerUpdateCheck } from "@/types/models";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useNotifications } from "@/hooks/useNotifications";
import { useShutdownCountdown } from "@/hooks/useShutdownCountdown";
import { useServerUpdateJob } from "@/hooks/useServerUpdateJob";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { CrystalStatus } from "@/components/fantasy/CrystalStatus";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { StartServerControl } from "@/components/serverControl/StartServerControl";
import { ActionButton } from "@/components/serverControl/ActionButton";
import { BroadcastDialog } from "@/components/serverControl/BroadcastDialog";
import { ShutdownCountdownDialog } from "@/components/serverControl/ShutdownCountdownDialog";
import { UpdateConfirmDialog } from "@/components/serverControl/UpdateConfirmDialog";
import { ServerUpdateProgressPanel } from "@/components/serverControl/ServerUpdateProgressPanel";
import { completeQuestStep } from "@/lib/questCompletion";
import { QuestSpotlight } from "@/components/university/QuestSpotlight";

type Action = "start" | "stop" | "restart" | "save" | "check-update" | "update" | null;

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
  const [updateCheck, setUpdateCheck] = React.useState<ServerUpdateCheck | null>(null);
  const [updateConfirmOpen, setUpdateConfirmOpen] = React.useState(false);

  const { countdown, start: startCountdown, cancel: cancelCountdown } = useShutdownCountdown(setStatus, notifications);
  const { updateJob, start: startUpdateTracking } = useServerUpdateJob(
    notifications,
    () => setBusyAction(null),
    refresh
  );

  const isOnline = status?.state === "online";
  const isTransitioning =
    status?.state === "starting" || status?.state === "stopping" || status?.state === "restarting";
  const updateRunning = updateJob?.status === "running" || busyAction === "update";

  async function handleStart() {
    setBusyAction("start");
    try {
      const s = await serverApi.startServer();
      setStatus(s);
      notifications.success({
        title: t("serverControl.notifications.ignitedTitle", { defaultValue: "Server ignited" }),
        message: t("serverControl.notifications.ignitedMessage", { defaultValue: "The realm awakens once more." }),
      });
      // Both Super Admin/Admin Basics' "start_server" and Mod Supervisor's
      // "disable_all" fallback live on this one action - completeQuestStep
      // only ever applies whichever one is genuinely the active course's
      // current step, so firing both here is safe.
      completeQuestStep("start_server");
      completeQuestStep("disable_all");
    } catch (e) {
      notifications.error({
        title: t("serverControl.notifications.startFailedTitle", { defaultValue: "Could not start server" }),
        message:
          e instanceof Error
            ? e.message
            : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
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
      completeQuestStep("stop_server");
      notifications.warning({
        title: t("serverControl.notifications.extinguishedTitle", { defaultValue: "Server extinguished" }),
        message: t("serverControl.notifications.extinguishedMessage", { defaultValue: "The realm has gone quiet." }),
      });
    } catch (e) {
      notifications.error({
        title: t("serverControl.notifications.stopFailedTitle", { defaultValue: "Could not stop server" }),
        message:
          e instanceof Error
            ? e.message
            : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
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
        message: t("serverControl.notifications.restartedMessage", {
          defaultValue: "The realm has been reforged anew.",
        }),
      });
    } catch (e) {
      notifications.error({
        title: t("serverControl.notifications.restartFailedTitle", { defaultValue: "Could not restart server" }),
        message:
          e instanceof Error
            ? e.message
            : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
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
        message: t("serverControl.notifications.savedMessage", {
          defaultValue: "Your realm's fate has been etched into stone.",
        }),
      });
    } catch (e) {
      notifications.error({
        title: t("serverControl.notifications.saveFailedTitle", { defaultValue: "Could not save world" }),
        message:
          e instanceof Error
            ? e.message
            : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
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
      completeQuestStep("check_updates");
      if (check.updateAvailable) {
        setUpdateConfirmOpen(true);
      } else if (check.canCompare) {
        notifications.success({
          title: t("serverControl.notifications.upToDateTitle", { defaultValue: "Server is up to date" }),
          message: check.installedBuildId
            ? t("serverControl.notifications.installedBuild", {
                defaultValue: "Installed build {{id}}.",
                id: check.installedBuildId,
              })
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
    } catch (e) {
      notifications.error({
        title: t("serverControl.notifications.checkUpdateFailedTitle", { defaultValue: "Could not check for updates" }),
        message:
          e instanceof Error
            ? e.message
            : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateServer() {
    if (isOnline) {
      notifications.warning({
        title: t("serverControl.notifications.stopFirstTitle", { defaultValue: "Stop the server first" }),
        message: t("serverControl.notifications.stopFirstMessage", {
          defaultValue: "Updates can only run while the server is offline.",
        }),
      });
      return;
    }
    setBusyAction("update");
    try {
      const job = await serverApi.startServerUpdate();
      startUpdateTracking(job.jobId);
      setUpdateConfirmOpen(false);
      notifications.info({
        title: t("serverControl.notifications.updateStartedTitle", { defaultValue: "Update started" }),
        message: t("serverControl.notifications.updateStartedMessage", {
          defaultValue: "SteamCMD is updating the stopped server.",
        }),
      });
    } catch (e) {
      setBusyAction(null);
      notifications.error({
        title: t("serverControl.notifications.couldNotStartUpdateTitle", { defaultValue: "Could not start update" }),
        message:
          e instanceof Error
            ? e.message
            : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
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
        message: t("serverControl.notifications.broadcastMessage", {
          defaultValue: "Your words echo across the realm.",
        }),
      });
      setBroadcastOpen(false);
      setBroadcastText("");
    } catch (e) {
      notifications.error({
        title: t("serverControl.notifications.broadcastFailedTitle", { defaultValue: "Could not send message" }),
        message:
          e instanceof Error
            ? e.message
            : t("serverControl.notifications.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setBroadcasting(false);
    }
  }

  async function handleStartCountdown() {
    await startCountdown(shutdownSeconds);
    setShutdownOpen(false);
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
                {t("serverControl.shuttingDownIn", {
                  defaultValue: "Shutting down in {{seconds}}s",
                  seconds: countdown,
                })}
              </p>
              <RuneButton variant="ghost" size="sm" icon={<Ban />} onClick={cancelCountdown}>
                {t("serverControl.cancel", { defaultValue: "Cancel" })}
              </RuneButton>
            </div>
          )}
        </div>
      </ScrollPanel>

      <ScrollPanel title={t("serverControl.ritesTitle", { defaultValue: "Rites of Command" })}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuestSpotlight stepId="start_server">
            <StartServerControl
              disabled={isOnline || isTransitioning}
              busy={busyAction === "start"}
              onStart={handleStart}
            />
          </QuestSpotlight>
          <QuestSpotlight stepId="stop_server">
            <ActionButton
              icon={<Square />}
              label={t("serverControl.stopServer", { defaultValue: "Stop Server" })}
              variant="danger"
              disabled={!isOnline}
              loading={busyAction === "stop"}
              onClick={() => setConfirmAction("stop")}
            />
          </QuestSpotlight>
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
          <QuestSpotlight stepId="check_updates">
            <ActionButton
              icon={<DownloadCloud />}
              label={t("serverControl.checkUpdates", { defaultValue: "Check Updates" })}
              variant="life"
              disabled={isTransitioning || updateRunning}
              loading={busyAction === "check-update" || updateRunning}
              onClick={handleCheckUpdate}
            />
          </QuestSpotlight>
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

      {updateJob && <ServerUpdateProgressPanel updateJob={updateJob} />}

      <RuneDialog
        open={confirmAction === "stop"}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        tone="danger"
        title={t("serverControl.stopDialog.title", { defaultValue: "Stop the server?" })}
        description={t("serverControl.stopDialog.description", {
          defaultValue:
            "All connected players will be disconnected immediately. This cannot be undone remotely once offline.",
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

      <UpdateConfirmDialog
        open={updateConfirmOpen}
        onOpenChange={setUpdateConfirmOpen}
        isOnline={isOnline}
        updateCheck={updateCheck}
        onConfirm={handleUpdateServer}
        confirming={busyAction === "update"}
      />

      <BroadcastDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        text={broadcastText}
        onTextChange={setBroadcastText}
        onSend={handleBroadcast}
        sending={broadcasting}
      />

      <ShutdownCountdownDialog
        open={shutdownOpen}
        onOpenChange={setShutdownOpen}
        seconds={shutdownSeconds}
        onSecondsChange={setShutdownSeconds}
        onBegin={handleStartCountdown}
      />
    </div>
  );
}
