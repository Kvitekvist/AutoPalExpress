import { motion } from "framer-motion";
import {
  Signal,
  Clock,
  Shield,
  MoreVertical,
  DoorOpen,
  Ban,
  ShieldCheck,
  MessageSquare,
  MapPin,
  Backpack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatOnlineDuration } from "@/lib/format";
import type { Player } from "@/types/models";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_CONFIG: Record<Player["connectionStatus"], { dot: string; label: string; text: string }> = {
  online: { dot: "bg-life-400 shadow-[0_0_8px_2px_rgba(79,206,124,0.7)] animate-glow-pulse", label: "Online", text: "text-life-400" },
  idle: { dot: "bg-gold-400 shadow-[0_0_8px_2px_rgba(223,177,90,0.6)]", label: "Idle", text: "text-gold-400" },
  offline: { dot: "bg-stone-500", label: "Offline", text: "text-parchment-300/40" },
};

function pingColor(ping: number) {
  if (ping < 60) return "text-life-400";
  if (ping < 120) return "text-gold-400";
  return "text-blood-400";
}

interface PlayerCardProps {
  player: Player;
  onKick: (player: Player) => void;
  onBan: (player: Player) => void;
  onUnban: (player: Player) => void;
  onMessage: (player: Player) => void;
}

export function PlayerCard({ player, onKick, onBan, onUnban, onMessage }: PlayerCardProps) {
  const status = STATUS_CONFIG[player.connectionStatus];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-gradient-to-b from-stone-800/80 to-abyss-900/90 bg-noise p-5 shadow-md shadow-black/30",
        player.isBanned ? "border-blood-600/40" : "border-stone-700 hover:border-gold-600/40"
      )}
    >
      {player.isBanned && (
        <div className="absolute right-3 top-3 rounded-full border border-blood-500/50 bg-blood-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blood-400">
          Banned
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gold-600/40 bg-gradient-to-br from-stone-700 to-abyss-900 font-display text-lg font-bold text-gold-300">
          {player.characterName.slice(0, 1).toUpperCase()}
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-abyss-900", status.dot)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold text-parchment-100">
              {player.characterName}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 rounded-md p-1 text-parchment-300/50 transition-colors hover:bg-stone-700/60 hover:text-gold-400">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onMessage(player)}>
                  <MessageSquare className="h-3.5 w-3.5" /> Send Message
                </DropdownMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="opacity-40 cursor-not-allowed"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Teleport
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="opacity-40 cursor-not-allowed"
                    >
                      <Backpack className="h-3.5 w-3.5" /> View Inventory
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={() => onKick(player)}>
                  <DoorOpen className="h-3.5 w-3.5" /> Kick
                </DropdownMenuItem>
                {player.isBanned ? (
                  <DropdownMenuItem onClick={() => onUnban(player)}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Unban
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem destructive onClick={() => onBan(player)}>
                    <Ban className="h-3.5 w-3.5" /> Ban
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="truncate font-mono text-[11px] text-parchment-300/45">{player.steamId}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-parchment-300/60">
          <Shield className="h-3.5 w-3.5 text-gold-500/70" />
          <span>
            Lvl <span className="font-mono text-parchment-100">{player.level}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-parchment-300/60">
          <Signal className={cn("h-3.5 w-3.5", pingColor(player.pingMs))} />
          <span className={cn("font-mono", pingColor(player.pingMs))}>{player.pingMs}ms</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-parchment-300/60">
          <span className="truncate">
            Guild: <span className="text-parchment-100">{player.guild ?? "Unaffiliated"}</span>
          </span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-parchment-300/60">
          <Clock className="h-3.5 w-3.5 text-gold-500/70" />
          {player.connectionStatus === "online" ? (
            <span>
              Online for <span className="text-parchment-100">{formatOnlineDuration(player.onlineSeconds)}</span>
            </span>
          ) : (
            <span>
              Last seen <span className="text-parchment-100">{new Date(player.joinedAt).toLocaleString()}</span>
            </span>
          )}
        </div>
      </div>

      <div className={cn("mt-3 flex items-center gap-1.5 border-t border-stone-700/60 pt-3 text-[11px] font-medium", status.text)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
        {status.label}
      </div>
    </motion.div>
  );
}
