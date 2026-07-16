import * as React from "react";
import { useTranslation } from "react-i18next";
import { networkApi } from "@/api";
import type { PortMappingInfo, UpnpStatus } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { TrafficLight, type TrafficLightColor } from "@/components/fantasy/TrafficLight";
import { Radar } from "lucide-react";

interface NetworkStatusLightsProps {
  hasInstance: boolean;
}

// Firewall blocked outright is the single most actionable "friends will see
// a timeout" state, so it always wins as red. Once the firewall is fine,
// forwarding that can't be confirmed (no UPnP router - manual forwarding
// required) reads as yellow UNLESS the super admin has explicitly marked it
// verified (TICKET-0140 - there's no automated way to test real internet
// reachability without UPnP, so this is a deliberate human claim, not
// something the app checked itself). A mapping pointed at a different
// machine always stays yellow regardless, since that's a genuinely known
// problem, not just missing confirmation. Anything fully confirmed is green.
function colorFor(
  firewallOk: boolean | null,
  available: boolean,
  mapping: PortMappingInfo | null,
  verified: boolean
): TrafficLightColor | null {
  if (firewallOk === null) return null;
  if (!firewallOk) return "red";
  if (mapping && !mapping.isThisMachine) return "yellow";
  if (!available) return verified ? "green" : "yellow";
  return "green";
}

export function NetworkStatusLights({ hasInstance }: NetworkStatusLightsProps) {
  const { t } = useTranslation();
  const [status, setStatus] = React.useState<UpnpStatus | null>(null);
  const [gameFirewallOk, setGameFirewallOk] = React.useState<boolean | null>(null);
  const [queryFirewallOk, setQueryFirewallOk] = React.useState<boolean | null>(null);
  const [adminFirewallOk, setAdminFirewallOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    networkApi.getUpnpStatus().then((data) => {
      setStatus(data);
      if (data.port) {
        networkApi.getGameFirewallStatus(data.port).then((r) => setGameFirewallOk(r.ruleExists));
      }
      if (data.queryPort && data.queryPort !== data.port) {
        networkApi.getGameFirewallStatus(data.queryPort).then((r) => setQueryFirewallOk(r.ruleExists));
      }
    });
    networkApi.getFirewallStatus().then((r) => setAdminFirewallOk(r.ruleExists));
  }, []);

  const gameColor: TrafficLightColor | null = !hasInstance
    ? "grey"
    : colorFor(gameFirewallOk, status?.available ?? false, status?.gameMapping ?? null, status?.gameVerified ?? false);

  const queryColor: TrafficLightColor | null = !hasInstance
    ? "grey"
    : !status
      ? null
      : !status.queryPort
        ? "grey"
        : colorFor(queryFirewallOk, status.available, status.queryMapping, status.queryVerified);

  const adminColor: TrafficLightColor | null = colorFor(
    adminFirewallOk,
    status?.available ?? false,
    status?.adminMapping ?? null,
    status?.adminVerified ?? false
  );

  return (
    <ScrollPanel icon={<Radar />} title={t("dashboard.networkLights.title", { defaultValue: "Network Status" })}>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <TrafficLight
          label={t("dashboard.networkLights.gamePort", { defaultValue: "Game Port" })}
          color={gameColor}
          hint={t("dashboard.networkLights.hint", {
            defaultValue:
              "Green = reachable or verified, yellow = check manually (or mark verified in Super Admin), red = firewall blocked, grey = not applicable",
          })}
        />
        <TrafficLight
          label={t("dashboard.networkLights.queryPort", { defaultValue: "Steam Query Port" })}
          color={queryColor}
          hint={t("dashboard.networkLights.hint", {
            defaultValue:
              "Green = reachable or verified, yellow = check manually (or mark verified in Super Admin), red = firewall blocked, grey = not applicable",
          })}
        />
        <TrafficLight
          label={t("dashboard.networkLights.adminPort", { defaultValue: "Remote Access" })}
          color={adminColor}
          hint={t("dashboard.networkLights.hint", {
            defaultValue:
              "Green = reachable or verified, yellow = check manually (or mark verified in Super Admin), red = firewall blocked, grey = not applicable",
          })}
        />
      </div>
    </ScrollPanel>
  );
}
