import { delay } from "./client";
import { mockDiscoveredServers } from "./mockData";
import type { ServerConnection, DiscoveredServer } from "@/types/models";

let connection: ServerConnection = {
  host: "127.0.0.1",
  port: 8212,
  adminPassword: "",
  connected: false,
};

// GET /api/connection
export async function getConnection(): Promise<ServerConnection> {
  return delay({ ...connection }, 250);
}

// POST /api/connection/test
export async function testConnection(params: {
  host: string;
  port: number;
  adminPassword: string;
}): Promise<ServerConnection> {
  await delay(null, 900);

  if (!params.host.trim()) {
    throw new Error("Enter a host or IP address.");
  }
  if (!params.port || params.port < 1 || params.port > 65535) {
    throw new Error("Enter a valid port number.");
  }
  if (!params.adminPassword.trim()) {
    throw new Error("Admin password is required to authenticate with the server's REST API.");
  }

  // NOTE: this endpoint is still mocked (no real backend talks to the Palworld
  // REST API yet), so it can't report a genuine server name/version - it only
  // confirms the fields are well-formed and marks the connection as active.
  connection = {
    host: params.host.trim(),
    port: params.port,
    adminPassword: params.adminPassword,
    connected: true,
    lastConnectedAt: new Date().toISOString(),
  };
  return delay({ ...connection }, 100);
}

// POST /api/connection/disconnect
export async function disconnectServer(): Promise<ServerConnection> {
  connection = { ...connection, connected: false };
  return delay({ ...connection }, 300);
}

// GET /api/connection/scan
export async function scanLan(): Promise<DiscoveredServer[]> {
  return delay(mockDiscoveredServers, 2200);
}
