import * as React from "react";
import { useTranslation } from "react-i18next";
import { Share2, Wifi, WifiOff, Copy, Check, ShieldCheck, ShieldAlert, Save } from "lucide-react";
import { networkApi, instancesApi, serverSettingsApi } from "@/api";
import type { UpnpStatus } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { Skeleton } from "@/components/fantasy/Skeleton";
import { ManualForwardInstructions } from "./ManualForwardInstructions";
import { useNotifications } from "@/hooks/useNotifications";

export function PortForwardPanel() {
  const { t } = useTranslation();
  const [hasInstance, setHasInstance] = React.useState<boolean | null>(null);
  const [status, setStatus] = React.useState<UpnpStatus | null>(null);
  const [port, setPort] = React.useState<number | null>(null);
  const [savedPort, setSavedPort] = React.useState<number | null>(null);
  const [savingPort, setSavingPort] = React.useState(false);
  const [queryPort, setQueryPort] = React.useState<number | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [firewallOk, setFirewallOk] = React.useState<boolean | null>(null);
  const [checkingFirewall, setCheckingFirewall] = React.useState(false);
  const [addingRule, setAddingRule] = React.useState(false);
  const [forwarding, setForwarding] = React.useState(false);
  const [unforwarding, setUnforwarding] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const notifications = useNotifications();

  // Derived from the router's actual current mapping, not local session
  // state - so a mapping created by another machine, or in an earlier
  // session, still shows up as removable here instead of looking like
  // nothing is forwarded.
  const mapping = status?.gameMapping ?? null;
  const portDirty = port !== null && port !== savedPort;
  const queryPortDiffers = !!(port && queryPort && queryPort !== port);

  const checkFirewall = React.useCallback(async (checkPort: number, checkQueryPort: number | null) => {
    setCheckingFirewall(true);
    try {
      const gameOk = (await networkApi.getGameFirewallStatus(checkPort)).ruleExists;
      const queryOk =
        !checkQueryPort || checkQueryPort === checkPort ? true : (await networkApi.getGameFirewallStatus(checkQueryPort)).ruleExists;
      setFirewallOk(gameOk && queryOk);
    } finally {
      setCheckingFirewall(false);
    }
  }, []);

  const check = React.useCallback(async () => {
    setChecking(true);
    try {
      const data = await networkApi.getUpnpStatus();
      setStatus(data);
      if (data.port) {
        setPort(data.port);
        setSavedPort(data.port);
      }
      setQueryPort(data.queryPort ?? null);
      if (data.port) {
        checkFirewall(data.port, data.queryPort);
      }
    } finally {
      setChecking(false);
    }
  }, [checkFirewall]);

  React.useEffect(() => {
    instancesApi.getActive().then((instance) => {
      setHasInstance(!!instance);
      if (instance) check();
    });
  }, [check]);

  function handlePortChange(value: string) {
    const parsed = parseInt(value, 10);
    setPort(Number.isNaN(parsed) ? null : parsed);
  }

  async function handleSavePort() {
    if (!port) return;
    setSavingPort(true);
    try {
      await serverSettingsApi.updateSettings({ PublicPort: port });
      await check();
      notifications.success({
        title: t("superAdmin.portForward.portUpdatedTitle", { defaultValue: "Game port updated" }),
        message: t("superAdmin.portForward.portUpdatedMessage", { defaultValue: "Takes effect the next time the server starts." }),
      });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.portForward.saveFailedTitle", { defaultValue: "Couldn't save" }),
        message: e instanceof Error ? e.message : t("superAdmin.portForward.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setSavingPort(false);
    }
  }

  async function handleAllowFirewall() {
    if (!port) return;
    setAddingRule(true);
    try {
      await networkApi.allowGamePortFirewall(port);
      if (queryPortDiffers && queryPort) {
        await networkApi.allowGamePortFirewall(queryPort);
      }
      setFirewallOk(true);
      notifications.success({
        title: t("superAdmin.portForward.firewallAddedTitle", { defaultValue: "Firewall rule added" }),
        message: queryPortDiffers
          ? t("superAdmin.portForward.firewallAddedMessageBoth", {
              defaultValue: "Windows will now allow incoming connections on UDP ports {{port}} and {{queryPort}}.",
              port,
              queryPort,
            })
          : t("superAdmin.portForward.firewallAddedMessage", {
              defaultValue: "Windows will now allow incoming connections on UDP port {{port}}.",
              port,
            }),
      });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.portForward.firewallFailedTitle", { defaultValue: "Couldn't add firewall rule" }),
        message: e instanceof Error ? e.message : t("superAdmin.portForward.unknownError", { defaultValue: "Unknown error." }),
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
      if (queryPortDiffers && queryPort) {
        await networkApi.forwardPort(queryPort);
      }
      setStatus((prev) => (prev ? { ...prev, externalIp: data.externalIp ?? prev.externalIp, port: data.port } : prev));
      await check();
      notifications.success({
        title: t("superAdmin.portForward.forwardedTitle", { defaultValue: "Port forwarded" }),
        message: queryPortDiffers
          ? t("superAdmin.portForward.forwardedMessageBoth", {
              defaultValue: "Friends can connect on port {{port}}, and Steam can query this server on port {{queryPort}}.",
              port: data.port,
              queryPort,
            })
          : t("superAdmin.portForward.forwardedMessage", { defaultValue: "Friends can connect on port {{port}}.", port: data.port }),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("superAdmin.portForward.forwardFailedFallback", { defaultValue: "Couldn't forward the port." });
      notifications.error({ title: t("superAdmin.portForward.forwardFailedTitle", { defaultValue: "Port forward failed" }), message });
    } finally {
      setForwarding(false);
    }
  }

  async function handleUnforward() {
    if (!port) return;
    setUnforwarding(true);
    try {
      await networkApi.unforwardPort(port);
      if (queryPortDiffers && queryPort) {
        await networkApi.unforwardPort(queryPort);
      }
      await check();
      notifications.info({
        title: t("superAdmin.portForward.removedTitle", { defaultValue: "Port forward removed" }),
        message: t("superAdmin.portForward.removedMessage", { defaultValue: "Friends can no longer connect from outside your network." }),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("superAdmin.portForward.removeFailedFallback", { defaultValue: "Couldn't remove the port forward." });
      notifications.error({ title: t("superAdmin.portForward.failedTitle", { defaultValue: "Failed" }), message });
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
    <ScrollPanel icon={<Share2 />} title={t("superAdmin.portForward.title", { defaultValue: "Share With Friends" })}>
      {!hasInstance ? (
        <p className="text-sm text-parchment-300/50">{t("superAdmin.portForward.noInstance", { defaultValue: "Set up a server first to share it with friends." })}</p>
      ) : !status ? (
        <div className="space-y-4">
          <div>
            <Label>{t("superAdmin.portForward.gamePort", { defaultValue: "Game Port" })}</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Skeleton className="h-10 max-w-[10rem] flex-1" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">{t("superAdmin.portForward.yourAddress", { defaultValue: "Your Address" })}</p>
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">{t("superAdmin.portForward.step1", { defaultValue: "1. Windows Firewall" })}</p>
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">{t("superAdmin.portForward.step2", { defaultValue: "2. Router Port Forward" })}</p>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="game-port">{t("superAdmin.portForward.gamePort", { defaultValue: "Game Port" })}</Label>
            <p className="mb-1.5 text-[11px] text-parchment-300/40">
              {t("superAdmin.portForward.gamePortHint", {
                defaultValue: "This is your server's actual configured port - the only place to change it. Takes effect the next time the server starts.",
              })}
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="game-port"
                type="number"
                value={port ?? ""}
                onChange={(e) => handlePortChange(e.target.value)}
                className="max-w-[10rem]"
              />
              <RuneButton
                type="button"
                variant="gold"
                size="sm"
                icon={<Save />}
                onClick={handleSavePort}
                disabled={!portDirty || savingPort || !port}
              >
                {savingPort ? t("superAdmin.portForward.saving", { defaultValue: "Saving..." }) : t("superAdmin.portForward.savePort", { defaultValue: "Save Port" })}
              </RuneButton>
            </div>
          </div>

          {queryPort && (
            <div className="border-t border-stone-700/60 pt-4">
              <Label htmlFor="query-port-value">{t("superAdmin.portForward.queryPort", { defaultValue: "Steam Query Port" })}</Label>
              <p className="mb-1.5 text-[11px] text-parchment-300/40">
                {t("superAdmin.portForward.queryPortReadOnlyHint", {
                  defaultValue: "Enabled in Launcher Options. It may also need firewall/router access for server-list discovery.",
                })}
              </p>
              <Input
                id="query-port-value"
                value={String(queryPort)}
                disabled
                className="max-w-[10rem] font-mono"
              />
            </div>
          )}

          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">{t("superAdmin.portForward.yourAddress", { defaultValue: "Your Address" })}</p>
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
                  {copied ? t("superAdmin.portForward.copied", { defaultValue: "Copied" }) : t("superAdmin.portForward.copy", { defaultValue: "Copy" })}
                </RuneButton>
              </div>
            ) : (
              <p className="text-sm text-parchment-300/50">{t("superAdmin.portForward.noPublicAddress", { defaultValue: "Couldn't determine your public address." })}</p>
            )}
            <p className="mt-1.5 text-[11px] text-parchment-300/40">
              {t("superAdmin.portForward.shareHint", { defaultValue: "Share this with friends; it only works once both steps below are done." })}
            </p>
          </div>

          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">{t("superAdmin.portForward.step1", { defaultValue: "1. Windows Firewall" })}</p>
            {firewallOk ? (
              <p className="flex items-center gap-1.5 text-sm text-life-400">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {t("superAdmin.portForward.firewallAllowed", { defaultValue: "Allowed: incoming UDP connections on port {{port}} aren't blocked.", port })}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-parchment-300/70">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-gold-400" />
                  {checkingFirewall
                    ? t("superAdmin.portForward.checking", { defaultValue: "Checking..." })
                    : t("superAdmin.portForward.firewallNotAllowed", { defaultValue: "Not allowed yet. Friends may see a timeout, not an error." })}
                </p>
                <div className="flex items-center gap-2">
                  <RuneButton
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={handleAllowFirewall}
                    disabled={addingRule || !port}
                  >
                    {addingRule
                      ? t("superAdmin.portForward.waitingForPermission", { defaultValue: "Waiting for permission..." })
                      : t("superAdmin.portForward.allowThroughFirewall", { defaultValue: "Allow Through Firewall" })}
                  </RuneButton>
                  <RuneButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => port && checkFirewall(port, queryPort)}
                    disabled={checkingFirewall || !port}
                  >
                    {t("superAdmin.portForward.checkAgain", { defaultValue: "Check Again" })}
                  </RuneButton>
                </div>
                <p className="text-[11px] text-parchment-300/40">
                  {t("superAdmin.portForward.uacHint", { defaultValue: 'Windows will show its own permission prompt; click "Yes" on it to continue.' })}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-stone-700/60 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">{t("superAdmin.portForward.step2", { defaultValue: "2. Router Port Forward" })}</p>
            {!status.available ? (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-parchment-300/70">
                  <WifiOff className="h-4 w-4 shrink-0 text-blood-400" />
                  {t("superAdmin.portForward.noUpnpRouter", { defaultValue: "No UPnP-capable router found on this network." })}
                </p>
                <p className="text-xs leading-relaxed text-parchment-300/40">
                  {t("superAdmin.portForward.noUpnpHint", {
                    defaultValue:
                      "Automatic port forwarding isn't available here. Your router may have UPnP disabled, or your connection may be behind carrier-grade NAT (common on some ISPs), which no local tool can work around. Forward it manually in your router's admin page instead:",
                  })}
                </p>
                {port && (
                  <ManualForwardInstructions
                    name={t("superAdmin.portForward.palworldServerName", { defaultValue: "Palworld Server" })}
                    protocol="UDP"
                    port={port}
                    localIp={status.localIp}
                  />
                )}
                {queryPortDiffers && queryPort && (
                  <>
                    <p className="text-xs leading-relaxed text-parchment-300/40">
                      {t("superAdmin.portForward.queryPortManualHint", {
                        defaultValue: "Your Steam query port is separate from your game port, so add this rule too:",
                      })}
                    </p>
                    <ManualForwardInstructions
                      name={t("superAdmin.portForward.steamQueryPortName", { defaultValue: "Palworld Server (Steam Query)" })}
                      protocol="UDP"
                      port={queryPort}
                      localIp={status.localIp}
                    />
                  </>
                )}
                <RuneButton type="button" variant="ghost" size="sm" onClick={check} disabled={checking}>
                  {checking ? t("superAdmin.portForward.checking", { defaultValue: "Checking..." }) : t("superAdmin.portForward.checkAgain", { defaultValue: "Check Again" })}
                </RuneButton>
              </div>
            ) : (
              <div className="space-y-3">
                {mapping ? (
                  mapping.isThisMachine ? (
                    <p className="flex items-center gap-1.5 text-sm text-life-400">
                      <Wifi className="h-4 w-4 shrink-0" />
                      {t("superAdmin.portForward.forwardedVia", { defaultValue: "Port {{port}} is forwarded via {{router}}.", port, router: status.routerName })}
                    </p>
                  ) : (
                    <p className="text-sm text-gold-400">
                      {t("superAdmin.portForward.forwardedElsewhere", {
                        defaultValue: "Port {{port}} is currently forwarded to a different machine on this network ({{client}}), not this PC.",
                        port,
                        client: mapping.internalClient,
                      })}
                    </p>
                  )
                ) : (
                  <p className="text-sm text-parchment-300/60">
                    {t("superAdmin.portForward.noMappingDetected", {
                      defaultValue:
                        'No mapping currently detected for this port - some routers don\'t report this reliably, so "Remove" is always available below just in case one exists anyway.',
                    })}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <RuneButton
                    type="button"
                    variant="gold"
                    size="sm"
                    icon={<Share2 />}
                    onClick={handleForward}
                    disabled={forwarding || !port}
                  >
                    {forwarding ? t("superAdmin.portForward.forwarding", { defaultValue: "Forwarding..." }) : t("superAdmin.portForward.forwardPort", { defaultValue: "Forward Port" })}
                  </RuneButton>
                  <RuneButton
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleUnforward}
                    disabled={unforwarding || !port}
                  >
                    {unforwarding
                      ? t("superAdmin.portForward.removing", { defaultValue: "Removing..." })
                      : t("superAdmin.portForward.removeThisForward", { defaultValue: "Remove This Forward" })}
                  </RuneButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ScrollPanel>
  );
}
