import * as React from "react";
import { serverApi } from "@/api";
import type { ServerStatus } from "@/types/models";

export function useServerStatus(pollMs = 4000) {
  const [status, setStatus] = React.useState<ServerStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const next = await serverApi.getServerStatus();
    setStatus(next);
    setLoading(false);
    return next;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let timer: number;

    async function tick() {
      const next = await serverApi.getServerStatus();
      if (cancelled) return;
      setStatus(next);
      setLoading(false);
      timer = window.setTimeout(tick, pollMs);
    }
    tick();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pollMs]);

  return { status, loading, refresh, setStatus };
}
