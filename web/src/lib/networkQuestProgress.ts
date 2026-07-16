import { networkApi } from "@/api";
import { completeQuestStep } from "@/lib/questCompletion";

/** Evaluates the Super Admin degree's "forward_ports"/"firewall" steps from
 * real, current network state (not whichever panel happened to trigger the
 * check) - called by both PortForwardPanel and RemoteAccessPanel after they
 * refresh their own status, since both the game and admin ports need to be
 * firewall-allowed and forwarded/verified before either step completes. */
export async function checkNetworkQuestProgress(): Promise<void> {
  const status = await networkApi.getUpnpStatus().catch(() => null);
  if (!status) return;

  const adminFirewallOk = (await networkApi.getFirewallStatus().catch(() => ({ ruleExists: false }))).ruleExists;
  const gameFirewallOk = status.port
    ? (await networkApi.getGameFirewallStatus(status.port).catch(() => ({ ruleExists: false }))).ruleExists
    : false;
  const firewallReady = adminFirewallOk && gameFirewallOk;

  const adminForwarded = status.available ? !!status.adminMapping?.isThisMachine : status.adminVerified;
  const gameForwarded = status.available ? !!status.gameMapping?.isThisMachine : status.gameVerified;
  const forwardReady = firewallReady && adminForwarded && gameForwarded;

  if (forwardReady) await completeQuestStep("forward_ports");
  if (firewallReady) await completeQuestStep("firewall");
}
