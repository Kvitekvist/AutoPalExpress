import * as React from "react";
import { useTranslation } from "react-i18next";
import { serverApi } from "@/api";
import type { ServerUpdateJob } from "@/types/models";
import type { useNotifications } from "@/hooks/useNotifications";

/** Tracks a running SteamCMD server-update job by polling its status. Owns
 * updateJob/updateJobId state and the poll effect; callers own busyAction
 * and any post-success refresh, since those are page-level concerns. */
export function useServerUpdateJob(
  notifications: ReturnType<typeof useNotifications>,
  onSettled: () => void,
  onSuccess: () => unknown
) {
  const { t } = useTranslation();
  const [updateJobId, setUpdateJobId] = React.useState<string | null>(null);
  const [updateJob, setUpdateJob] = React.useState<ServerUpdateJob | null>(null);

  React.useEffect(() => {
    if (!updateJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const job = await serverApi.getServerUpdateJob(updateJobId);
        if (cancelled) return;
        setUpdateJob(job);
        if (job.status === "done") {
          setUpdateJobId(null);
          onSettled();
          notifications.success({
            title: t("serverControl.notifications.serverUpdatedTitle", { defaultValue: "Server updated" }),
            message: job.installedBuildId
              ? t("serverControl.notifications.installedBuild", { defaultValue: "Installed build {{id}}.", id: job.installedBuildId })
              : t("serverControl.notifications.updateFinished", { defaultValue: "SteamCMD finished the update." }),
          });
          await onSuccess();
        } else if (job.status === "error") {
          setUpdateJobId(null);
          onSettled();
          notifications.error({
            title: t("serverControl.notifications.updateFailedTitle", { defaultValue: "Update failed" }),
            message: job.error ?? t("serverControl.notifications.updateFailedFallback", { defaultValue: "SteamCMD could not update the server." }),
          });
        }
      } catch (e) {
        if (!cancelled) {
          setUpdateJobId(null);
          onSettled();
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
  }, [updateJobId, notifications, t]);

  const start = React.useCallback(
    (jobId: string) => {
      setUpdateJobId(jobId);
      setUpdateJob({
        status: "running",
        log: [t("serverControl.notifications.startingUpdateLog", { defaultValue: "Starting SteamCMD update..." })],
        error: null,
        installedBuildId: null,
        latestBuildId: null,
      });
    },
    [t]
  );

  return { updateJob, start };
}
