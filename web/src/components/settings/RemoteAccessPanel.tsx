import * as React from "react";
import { useTranslation } from "react-i18next";
import { Globe, Copy, Check, ShieldCheck, ShieldAlert } from "lucide-react";
import { networkApi } from "@/api";
import type { UpnpStatus } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { ManualForwardInstructions } from "./ManualForwardInstructions";
import { useNotifications } from "@/hooks/useNotifications";

export function RemoteAccessPanel() {
  const { t } = useTranslation();
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
        title: t("superAdmin.remoteAccess.firewallAddedTitle", { defaultValue: "Firewall rule added" }),
        message: t("superAdmin.remoteAccess.firewallAddedMessage", { defaultValue: "Windows will now allow incoming connections to the admin panel." }),
      });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.remoteAccess.firewallFailedTitle", { defaultValue: "Couldn't add firewall rule" }),
        message: e instanceof Error ? e.message : t("superAdmin.remoteAccess.unknownError", { defaultValue: "Unknown error." }),
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
        title: t("superAdmin.remoteAccess.forwardedTitle", { defaultValue: "Admin panel forwarded" }),
        message: t("superAdmin.remoteAccess.forwardedMessage", { defaultValue: "Friends can now reach the login page from outside." }),
      });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.remoteAccess.forwardFailedTitle", { defaultValue: "Couldn't forward" }),
        message: e instanceof Error ? e.message : t("superAdmin.remoteAccess.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setForwarding(false);
    }
  }

  async function handleUnforward() {
    setUnforwarding(true);
    try {
      await networkApi.unforwardAdminPort();
      refreshStatus();
      notifications.info({ title: t("superAdmin.remoteAccess.closedTitle", { defaultValue: "Remote access closed" }) });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.remoteAccess.removeFailedTitle", { defaultValue: "Couldn't remove" }),
        message: e instanceof Error ? e.message : t("superAdmin.remoteAccess.unknownError", { defaultValue: "Unknown error." }),
      });
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
    <ScrollPanel icon={<Globe />} title={t("superAdmin.remoteAccess.title", { defaultValue: "Remote Access" })}>
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        {t("superAdmin.remoteAccess.description", {
          defaultValue:
            "Open this admin panel to the internet so friends with an account can log in from outside your network. This is separate from sharing the game server itself, and needs two things: Windows has to allow the connection in, then your router has to forward it here.",
        })}
      </p>

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">{t("superAdmin.portForward.step1", { defaultValue: "1. Windows Firewall" })}</p>
          {firewallOk ? (
            <p className="flex items-center gap-1.5 text-sm text-life-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {t("superAdmin.remoteAccess.firewallAllowed", { defaultValue: "Allowed: incoming connections on port {{port}} aren't blocked.", port: status.adminPort })}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm text-parchment-300/70">
                <ShieldAlert className="h-4 w-4 shrink-0 text-gold-400" />
                {t("superAdmin.remoteAccess.firewallNotAllowed", {
                  defaultValue: "Not allowed yet. This is the most common reason friends can't connect (looks like a timeout, not an error).",
                })}
              </p>
              <RuneButton type="button" variant="gold" size="sm" onClick={handleAllowFirewall} disabled={addingRule}>
                {addingRule
                  ? t("superAdmin.portForward.waitingForPermission", { defaultValue: "Waiting for permission..." })
                  : t("superAdmin.portForward.allowThroughFirewall", { defaultValue: "Allow Through Firewall" })}
              </RuneButton>
              <p className="text-[11px] text-parchment-300/40">
                {t("superAdmin.portForward.uacHint", { defaultValue: 'Windows will show its own permission prompt; click "Yes" on it to continue.' })}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-stone-700/60 pt-4">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-parchment-300/40">{t("superAdmin.portForward.step2", { defaultValue: "2. Router Port Forward" })}</p>

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
                {copied ? t("superAdmin.portForward.copied", { defaultValue: "Copied" }) : t("superAdmin.portForward.copy", { defaultValue: "Copy" })}
              </RuneButton>
            </div>
          )}

          {!status.available ? (
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-parchment-300/40">
                {t("superAdmin.remoteAccess.noUpnpHint", {
                  defaultValue: "No UPnP-capable router found, so this can't be opened automatically. Forward it manually in your router's admin page instead:",
                })}
              </p>
              <ManualForwardInstructions
                name={t("superAdmin.remoteAccess.adminPanelName", { defaultValue: "Palworld Server Admin Panel" })}
                protocol="TCP"
                port={status.adminPort}
                localIp={status.localIp}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {mapping ? (
                mapping.isThisMachine ? (
                  <p className="text-sm text-life-400">
                    {t("superAdmin.remoteAccess.openVia", { defaultValue: "Remote access is open via {{router}}.", router: status.routerName })}
                  </p>
                ) : (
                  <p className="text-sm text-gold-400">
                    {t("superAdmin.portForward.forwardedElsewhere", {
                      defaultValue: "Port {{port}} is currently forwarded to a different machine on this network ({{client}}), not this PC.",
                      port: status.adminPort,
                      client: mapping.internalClient,
                    })}
                  </p>
                )
              ) : (
                <p className="text-xs text-parchment-300/40">
                  {t("superAdmin.portForward.noMappingDetected", {
                    defaultValue:
                      'No mapping currently detected for this port - some routers don\'t report this reliably, so "Remove" is always available below just in case one exists anyway.',
                  })}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <RuneButton type="button" variant="gold" size="sm" onClick={handleForward} disabled={forwarding}>
                  {forwarding ? t("superAdmin.remoteAccess.opening", { defaultValue: "Opening..." }) : t("superAdmin.remoteAccess.openRemoteAccess", { defaultValue: "Open Remote Access" })}
                </RuneButton>
                <RuneButton type="button" variant="danger" size="sm" onClick={handleUnforward} disabled={unforwarding}>
                  {unforwarding
                    ? t("superAdmin.remoteAccess.closing", { defaultValue: "Closing..." })
                    : t("superAdmin.portForward.removeThisForward", { defaultValue: "Remove This Forward" })}
                </RuneButton>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 border-t border-stone-700/60 pt-3 text-[11px] leading-relaxed text-parchment-300/35">
        {t("superAdmin.remoteAccess.httpWarning", {
          defaultValue:
            "This sends login credentials over plain HTTP, not HTTPS. Fine on a trusted home network, but anyone between your friend and your router (e.g. on public wifi) could theoretically intercept them. For stronger privacy, consider a private network tool like Tailscale instead of exposing this port directly.",
        })}
      </p>
    </ScrollPanel>
  );
}
