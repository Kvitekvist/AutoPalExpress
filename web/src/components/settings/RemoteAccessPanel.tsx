import * as React from "react";
import { Globe, Copy, Check, ShieldCheck, ShieldAlert } from "lucide-react";
import { networkApi } from "@/api";
import type { UpnpStatus } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

export function RemoteAccessPanel() {
  const [status, setStatus] = React.useState<UpnpStatus | null>(null);
  const [firewallOk, setFirewallOk] = React.useState<boolean | null>(null);
  const [addingRule, setAddingRule] = React.useState(false);
  const [forwarding, setForwarding] = React.useState(false);
  const [unforwarding, setUnforwarding] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const notifications = useNotifications();

  const refreshStatus = React.useCallback(() => {
    networkApi.getUpnpStatus().then(setStatus);
  }, []);

  React.useEffect(() => {
    refreshStatus();
    networkApi.getFirewallStatus().then((s) => setFirewallOk(s.ruleExists));
  }, [refreshStatus]);

  // Derived from the router's actual current mapping, not local session
  // state - so a mapping created by another machine, or in an earlier
  // session, still shows up as removable here instead of looking like
  // nothing is forwarded.
  const mapping = status?.adminMapping ?? null;

  async function handleAllowFirewall() {
    setAddingRule(true);
    try {
      await networkApi.allowAdminPortFirewall();
      setFirewallOk(true);
      notifications.success({
        title: "Firewall rule added",
        message: "Windows will now allow incoming connections to the admin panel.",
      });
    } catch (e) {
      notifications.error({
        title: "Couldn't add firewall rule",
        message: e instanceof Error ? e.message : "Unknown error.",
      });
    } finally {
      setAddingRule(false);
    }
  }

  async function handleForward() {
    setForwarding(true);
    try {
      await networkApi.forwardAdminPort();
      refreshStatus();
      notifications.success({
        title: "Admin panel forwarded",
        message: "Friends can now reach the login page from outside.",
      });
    } catch (e) {
      notifications.error({ title: "Couldn't forward", message: e instanceof Error ? e.message : "Unknown error." });
    } finally {
      setForwarding(false);
    }
  }

  async function handleUnforward() {
    setUnforwarding(true);
    try {
      await networkApi.unforwardAdminPort();
      refreshStatus();
      notifications.info({ title: "Remote access closed" });
    } catch (e) {
      notifications.error({ title: "Couldn't remove", message: e instanceof Error ? e.message : "Unknown error." });
    } finally {
      setUnforwarding(false);
    }
  }

  function handleCopy() {
    if (!status?.externalIp) return;
    navigator.clipboard.writeText(`http://${status.externalIp}:${status.adminPort}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!status) return null;

  return (
    <ScrollPanel icon={<Globe />} title="Remote Access">
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        Open this admin panel to the internet so friends with an account can log in from outside your network. This
        is separate from sharing the game server itself, and needs two things: Windows has to allow the connection
        in, then your router has to forward it here.
      </p>

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">1. Windows Firewall</p>
          {firewallOk ? (
            <p className="flex items-center gap-1.5 text-sm text-life-400">
              <ShieldCheck className="h-4 w-4 shrink-0" /> Allowed: incoming connections on port {status.adminPort}{" "}
              aren't blocked.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm text-parchment-300/70">
                <ShieldAlert className="h-4 w-4 shrink-0 text-gold-400" /> Not allowed yet. This is the most common
                reason friends can't connect (looks like a timeout, not an error).
              </p>
              <RuneButton type="button" variant="gold" size="sm" onClick={handleAllowFirewall} disabled={addingRule}>
                {addingRule ? "Waiting for permission..." : "Allow Through Firewall"}
              </RuneButton>
              <p className="text-[11px] text-parchment-300/40">
                Windows will show its own permission prompt; click "Yes" on it to continue.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-stone-700/60 pt-4">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">2. Router Port Forward</p>

          {status.externalIp && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-stone-700 bg-abyss-900/40 px-3 py-2">
              <span className="flex-1 truncate font-mono text-sm text-parchment-100">
                http://{status.externalIp}:{status.adminPort}
              </span>
              <RuneButton
                type="button"
                variant="ghost"
                size="sm"
                icon={copied ? <Check /> : <Copy />}
                onClick={handleCopy}
              >
                {copied ? "Copied" : "Copy"}
              </RuneButton>
            </div>
          )}

          {!status.available ? (
            <p className="text-xs leading-relaxed text-parchment-300/40">
              No UPnP-capable router found, so this can't be opened automatically. Forward TCP port{" "}
              {status.adminPort} to this PC manually in your router's admin page if you want remote access.
            </p>
          ) : mapping ? (
            <div className="space-y-3">
              {mapping.isThisMachine ? (
                <p className="text-sm text-life-400">Remote access is open via {status.routerName}.</p>
              ) : (
                <p className="text-sm text-gold-400">
                  Port {status.adminPort} is currently forwarded to a different machine on this network (
                  {mapping.internalClient}), not this PC. Remove it here, then forward it again from whichever
                  machine should actually receive it.
                </p>
              )}
              <RuneButton type="button" variant="danger" size="sm" onClick={handleUnforward} disabled={unforwarding}>
                {unforwarding ? "Closing..." : "Remove This Forward"}
              </RuneButton>
            </div>
          ) : (
            <RuneButton type="button" variant="gold" size="sm" onClick={handleForward} disabled={forwarding}>
              {forwarding ? "Opening..." : "Open Remote Access"}
            </RuneButton>
          )}
        </div>
      </div>

      <p className="mt-4 border-t border-stone-700/60 pt-3 text-[11px] leading-relaxed text-parchment-300/35">
        This sends login credentials over plain HTTP, not HTTPS. Fine on a trusted home network, but anyone between
        your friend and your router (e.g. on public wifi) could theoretically intercept them. For stronger privacy,
        consider a private network tool like Tailscale instead of exposing this port directly.
      </p>
    </ScrollPanel>
  );
}
