import * as React from "react";
import { useTranslation } from "react-i18next";
import { serverApi } from "@/api";
import type { ServerStatus } from "@/types/models";
import type { useNotifications } from "@/hooks/useNotifications";

export function useShutdownCountdown(
  setStatus: (status: ServerStatus) => void,
  notifications: ReturnType<typeof useNotifications>
) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      serverApi.stopServer().then((s) => {
        setStatus(s);
        notifications.error({
          title: t("serverControl.notifications.wentDarkTitle", { defaultValue: "Server has gone dark" }),
          message: t("serverControl.notifications.wentDarkMessage", {
            defaultValue: "The shutdown countdown reached zero.",
          }),
        });
      });
      return;
    }
    const timeoutId = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [countdown, notifications, setStatus, t]);

  const start = React.useCallback(
    async (seconds: number) => {
      await serverApi.startShutdownCountdown(seconds);
      setCountdown(seconds);
      notifications.warning({
        title: t("serverControl.notifications.countdownStartedTitle", { defaultValue: "Shutdown countdown started" }),
        message: t("serverControl.notifications.countdownStartedMessage", {
          defaultValue: "The server will fall silent in {{seconds}}s.",
          seconds,
        }),
      });
    },
    [notifications, t]
  );

  const cancel = React.useCallback(async () => {
    await serverApi.cancelShutdownCountdown();
    setCountdown(null);
    notifications.info({
      title: t("serverControl.notifications.countdownCancelledTitle", { defaultValue: "Countdown cancelled" }),
      message: t("serverControl.notifications.countdownCancelledMessage", {
        defaultValue: "The realm's fate has been spared, for now.",
      }),
    });
  }, [notifications, t]);

  return { countdown, start, cancel };
}
