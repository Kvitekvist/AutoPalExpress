import type { Player, ServerSettings } from "@/types/models";

export const mockPlayers: Player[] = [];

export const mockSettings: ServerSettings = {
  serverName: "",
  serverPassword: "",
  maxPlayers: 32,
  difficulty: "normal",
  pvpEnabled: false,
  expRate: 1,
  dayNightLengthMinutes: 60,
};
