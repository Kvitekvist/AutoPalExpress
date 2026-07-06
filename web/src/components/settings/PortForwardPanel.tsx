import * as React from "react";
import { Share2, Wifi, WifiOff, Copy, Check, ShieldCheck, ShieldAlert } from "lucide-react";
import { networkApi, instancesApi } from "@/api";
import type { UpnpStatus } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

export function PortForwardPanel() {
  const [hasInstance, setHasInstance] = React.useState<boolean | null>(null);
  const [status, setStatus] = React.useState<UpnpStatus | null>(null);
  const [port, setPort] = React.useState<number | null>(null);
  const [portTouched, setPortTouched] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [firewallOk, setFirewallOk] = React.useState<boolean | null>(null);
  const [checkingFirewall, setCheckingFirewall] = React.useState(false);
  const [addingRule, setAddingRule] = React.useState(false);
  const [forwarding, setForwarding] = React.useState(false);
  const [unforwarding, setUnforwarding] = React.useState(false);
  const [forwarded, setForwarded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const notifications = useNotifications();

  const checkFirewall = React.useCallback(async (checkPort: number) => {
    setCheckingFirewall(true);
    try {
      const data = await networkApi.getGameFirewallStatus(checkPort);
      setFirewallOk(data.ruleExists);
    } finally {
      setCheckingFirewall(false);
    }
  }, []);

  const check = React.useCallback(async () => {
    setChecking(true);
    try {
      const data = await networkApi.getUpnpStatus();
      setStatus(data);
      if (!portTouched && data.port) {
        setPort(data.port);
        checkFirewall(data.port);
      }
    } finally {
      setChecking(false);
    }
  }, [portTouched, checkFirewall]);

  React.useEffect(() => {
    instancesApi.getActive().then((instance) => {
      setHasInstance(!!instance);
      if (instance) check();
    });
  }, [check]);

  function handlePortChange(value: string) {
    const parsed = parseInt(value, 10);
    setPortTouched(true);
    setPort(Number.isNaN(parsed) ? null : parsed);
    setFirewallOk(null);
  }

  async function handleAllowFirewall() {
    if (!port) return;
    setAddingRule(true);
    try {
      await networkApi.allowGamePortFirewall(port);
      setFirewallOk(true);
      notifications.success({
        title: "Firewall rule added",
        message: `Windows will now allow incoming connections on UDP port ${port}.`,
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
    if (!port) return;
    setForwarding(true);
    try {
      const data = await networkApi.forwardPort(port);
      setForwarded(true);
      setStatus((prev) => (prev ? { ...prev, externalIp: data.externalIp ?? prev.externalIp, port: data.port } : prev));
      notifications.success({ title: "Port forwarded", message: `Friends can connect on port ${data.port}.` });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't forward the port.";
      notifications.error({ title: "Port forward failed", message });
    } finally {
      setForwarding(false);
    }
  }

  async function handleUnforward() {
    if (!port) return;
    setUnforwarding(true);
    try {
      await networkApi.unforwardPort(port);
      setForwarded(false);
      notifications.info({
        title: "Port forward removed",
        message: "Friends can no longer connect from outside your network.",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't remove the port forward.";
      notifications.error({ title: "Failed", message });
    } finally {
      setUnforwarding(false);
    }
  }

  function handleCopy() {
    if (!status?.externalIp || !port) return;
    navigator.clipboard.writeText(`${status.externalIp}:${port}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (hasInstance === null) return null;

  return (
    <ScrollPanel icon={<Share2 />} title="Share With Friends">
      {!hasInstance ? (
        <p className="text-sm text-parchment-300/50">Set up a server first to share it with friends.</p>
      ) : !status ? (
        <p className="animate-pulse text-sm text-parchment-300/50">Looking up your public address...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="game-port">Game Port</Label>
              <span className="text-[11px] uppercase tracking-wide text-parchment-300/40">
                {portTouched ? "Manually set" : "Auto-detected"}
              </span>
            </div>
            <Input
              id="game-port"
              type="number"
              value={port ?? ""}
              onChange={(e) => handlePortChange(e.target.value)}
              className="max-w-[10rem]"
            />
            <p className="mt-1 text-[11px] text-parchment-300/40">
              Defaults to your server's actual configured port. Only change this if you know what you're doing.
            </p>
          </div>

          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">Your Address</p>
            {status.externalIp && port ? (
              <div className="flex items-center gap-2 rounded-md border border-stone-700 bg-abyss-900/40 px-3 py-2">
                <span className="flex-1 truncate font-mono text-sm text-parchment-100">
                  {status.externalIp}:{port}
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
            ) : (
              <p className="text-sm text-parchment-300/50">Couldn't determine your public address.</p>
            )}
            <p className="mt-1.5 text-[11px] text-parchment-300/40">
              Share this with friends; it only works once both steps below are done.
            </p>
          </div>

          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">1. Windows Firewall</p>
            {firewallOk ? (
              <p className="flex items-center gap-1.5 text-sm text-life-400">
                <ShieldCheck className="h-4 w-4 shrink-0" /> Allowed: incoming UDP connections on port {port} aren't
                blocked.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-parchment-300/70">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-gold-400" />
                  {checkingFirewall ? "Checking..." : "Not allowed yet. Friends may see a timeout, not an error."}
                </p>
                <div className="flex items-center gap-2">
                  <RuneButton
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={handleAllowFirewall}
                    disabled={addingRule || !port}
                  >
                    {addingRule ? "Waiting for permission..." : "Allow Through Firewall"}
                  </RuneButton>
                  <RuneButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => port && checkFirewall(port)}
                    disabled={checkingFirewall || !port}
                  >
                    Check Again
                  </RuneButton>
                </div>
                <p className="text-[11px] text-parchment-300/40">
                  Windows will show its own permission prompt; click "Yes" on it to continue.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">2. Router Port Forward</p>
            {!status.available ? (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-parchment-300/70">
                  <WifiOff className="h-4 w-4 shrink-0 text-blood-400" /> No UPnP-capable router found on this
                  network.
                </p>
                <p className="text-xs leading-relaxed text-parchment-300/40">
                  Automatic port forwarding isn't available here. Your router may have UPnP disabled, or your
                  connection may be behind carrier-grade NAT (common on some ISPs), which no local tool can work
                  around. You'll need to forward the game port manually in your router's admin page.
                </p>
                <RuneButton type="button" variant="ghost" size="sm" onClick={check} disabled={checking}>
                  {checking ? "Checking..." : "Check Again"}
                </RuneButton>
              </div>
            ) : forwarded ? (
              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-sm text-life-400">
                  <Wifi className="h-4 w-4 shrink-0" /> Port {port} is forwarded via {status.routerName}.
                </p>
                <RuneButton type="button" variant="danger" size="sm" onClick={handleUnforward} disabled={unforwarding}>
                  {unforwarding ? "Removing..." : "Remove Forward"}
                </RuneButton>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-parchment-300/60">
                  {status.routerName} supports automatic port forwarding. Open your game port so friends can connect
                  without you touching your router.
                </p>
                <RuneButton
                  type="button"
                  variant="gold"
                  size="sm"
                  icon={<Share2 />}
                  onClick={handleForward}
                  disabled={forwarding || !port}
                >
                  {forwarding ? "Forwarding..." : "Forward Port"}
                </RuneButton>
              </div>
            )}
          </div>
        </div>
      )}
    </ScrollPanel>
  );
}
