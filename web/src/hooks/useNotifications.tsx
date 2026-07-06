import * as React from "react";
import type { AppNotification, NotificationKind } from "@/types/models";
import { MagicNotificationStack } from "@/components/fantasy/MagicNotification";

interface NotifyOptions {
  title: string;
  message?: string;
  durationMs?: number;
}

interface NotificationContextValue {
  notify: (kind: NotificationKind, options: NotifyOptions) => void;
  success: (options: NotifyOptions | string) => void;
  info: (options: NotifyOptions | string) => void;
  warning: (options: NotifyOptions | string) => void;
  error: (options: NotifyOptions | string) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

function normalize(opts: NotifyOptions | string): NotifyOptions {
  return typeof opts === "string" ? { title: opts } : opts;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<AppNotification[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = React.useCallback(
    (kind: NotificationKind, options: NotifyOptions) => {
      const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: AppNotification = {
        id,
        kind,
        title: options.title,
        message: options.message,
        createdAt: Date.now(),
      };
      setItems((prev) => [...prev, entry]);
      const duration = options.durationMs ?? 4500;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = React.useMemo<NotificationContextValue>(
    () => ({
      notify,
      success: (o) => notify("success", normalize(o)),
      info: (o) => notify("info", normalize(o)),
      warning: (o) => notify("warning", normalize(o)),
      error: (o) => notify("error", normalize(o)),
      dismiss,
    }),
    [notify, dismiss]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <MagicNotificationStack items={items} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
