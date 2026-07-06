import { api } from "./httpClient";
import type { UpnpStatus, PortForwardResult } from "@/types/models";

// GET /api/network/upnp/status
export async function getUpnpStatus(): Promise<UpnpStatus> {
  return api.get<UpnpStatus>("/api/network/upnp/status");
}

// POST /api/network/upnp/forward
export async function forwardPort(port?: number): Promise<PortForwardResult> {
  return api.post<PortForwardResult>("/api/network/upnp/forward", port ? { port } : undefined);
}

// POST /api/network/upnp/unforward
export async function unforwardPort(port?: number): Promise<{ port: number }> {
  return api.post<{ port: number }>("/api/network/upnp/unforward", port ? { port } : undefined);
}

// POST /api/network/upnp/forward-admin
export async function forwardAdminPort(): Promise<PortForwardResult> {
  return api.post<PortForwardResult>("/api/network/upnp/forward-admin");
}

// POST /api/network/upnp/unforward-admin
export async function unforwardAdminPort(): Promise<{ port: number }> {
  return api.post<{ port: number }>("/api/network/upnp/unforward-admin");
}

// GET /api/network/firewall/status
export async function getFirewallStatus(): Promise<{ ruleExists: boolean }> {
  return api.get<{ ruleExists: boolean }>("/api/network/firewall/status");
}

// POST /api/network/firewall/allow-admin-port
export async function allowAdminPortFirewall(): Promise<{ ruleExists: boolean }> {
  return api.post<{ ruleExists: boolean }>("/api/network/firewall/allow-admin-port");
}

// GET /api/network/firewall/game-status?port=X&protocol=UDP
export async function getGameFirewallStatus(port: number, protocol = "UDP"): Promise<{ ruleExists: boolean }> {
  return api.get<{ ruleExists: boolean }>(
    `/api/network/firewall/game-status?port=${port}&protocol=${protocol}`
  );
}

// POST /api/network/firewall/allow-game-port
export async function allowGamePortFirewall(port: number, protocol = "UDP"): Promise<{ ruleExists: boolean }> {
  return api.post<{ ruleExists: boolean }>("/api/network/firewall/allow-game-port", { port, protocol });
}
