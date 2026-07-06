import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { Search, Users2 } from "lucide-react";
import { playersApi } from "@/api";
import type { Player } from "@/types/models";
import { PlayerCard } from "@/components/players/PlayerCard";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { GuildTable, type GuildTableColumn } from "@/components/fantasy/GuildTable";
import { AncientTabs, AncientTabsList, AncientTabsTrigger } from "@/components/fantasy/AncientTabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

type Filter = "all" | "online" | "idle" | "offline";

interface GuildRow {
  guild: string;
  members: number;
  avgLevel: number;
  avgPing: number;
}

export function PlayersSection() {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [pending, setPending] = React.useState(false);
  const notifications = useNotifications();

  const [kickTarget, setKickTarget] = React.useState<Player | null>(null);
  const [banTarget, setBanTarget] = React.useState<Player | null>(null);
  const [unbanTarget, setUnbanTarget] = React.useState<Player | null>(null);
  const [messageTarget, setMessageTarget] = React.useState<Player | null>(null);
  const [messageText, setMessageText] = React.useState("");

  React.useEffect(() => {
    playersApi
      .getPlayers()
      .then((p) => setPlayers(p))
      .catch((e: Error) => notifications.error({ title: "Couldn't load the roster", message: e.message }))
      .finally(() => setLoading(false));
  }, [notifications]);

  const filtered = players.filter((p) => {
    if (filter !== "all" && p.connectionStatus !== filter) return false;
    if (search && !p.characterName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const guildRows: GuildRow[] = React.useMemo(() => {
    const groups = new Map<string, Player[]>();
    for (const p of players) {
      const key = p.guild ?? "Unaffiliated";
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return Array.from(groups.entries())
      .map(([guild, members]) => ({
        guild,
        members: members.length,
        avgLevel: Math.round(members.reduce((s, m) => s + m.level, 0) / members.length),
        avgPing: Math.round(members.reduce((s, m) => s + m.pingMs, 0) / members.length),
      }))
      .sort((a, b) => b.members - a.members);
  }, [players]);

  const guildColumns: GuildTableColumn<GuildRow>[] = [
    { key: "guild", header: "Guild", render: (r) => <span className="font-display font-medium text-gold-300">{r.guild}</span> },
    { key: "members", header: "Members", align: "center", render: (r) => r.members },
    { key: "avgLevel", header: "Avg Level", align: "center", render: (r) => r.avgLevel },
    { key: "avgPing", header: "Avg Ping", align: "right", render: (r) => `${r.avgPing}ms` },
  ];

  async function handleKick() {
    if (!kickTarget) return;
    setPending(true);
    try {
      const updated = await playersApi.kickPlayer(kickTarget.id);
      setPlayers(updated);
      notifications.success({ title: "Player kicked", message: `${kickTarget.characterName} was removed from the realm.` });
    } finally {
      setPending(false);
      setKickTarget(null);
    }
  }

  async function handleBan() {
    if (!banTarget) return;
    setPending(true);
    try {
      const updated = await playersApi.banPlayer(banTarget.id);
      setPlayers(updated);
      notifications.error({ title: "Player banished", message: `${banTarget.characterName} has been cast out and banned.` });
    } finally {
      setPending(false);
      setBanTarget(null);
    }
  }

  async function handleUnban() {
    if (!unbanTarget) return;
    setPending(true);
    try {
      const updated = await playersApi.unbanPlayer(unbanTarget.id);
      setPlayers(updated);
      notifications.success({ title: "Ban lifted", message: `${unbanTarget.characterName} may return to the realm.` });
    } finally {
      setPending(false);
      setUnbanTarget(null);
    }
  }

  async function handleSendMessage() {
    if (!messageTarget || !messageText.trim()) return;
    setPending(true);
    try {
      await playersApi.sendPlayerMessage(messageTarget.id, messageText.trim());
      notifications.info({ title: "Message sent", message: `Whisper delivered to ${messageTarget.characterName}.` });
      setMessageTarget(null);
      setMessageText("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <ScrollPanel noPadding icon={<Users2 />} title="Roster">
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-300/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by character name..."
                className="pl-9"
              />
            </div>
            <AncientTabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <AncientTabsList>
                <AncientTabsTrigger value="all">All ({players.length})</AncientTabsTrigger>
                <AncientTabsTrigger value="online">Online</AncientTabsTrigger>
                <AncientTabsTrigger value="idle">Idle</AncientTabsTrigger>
                <AncientTabsTrigger value="offline">Offline</AncientTabsTrigger>
              </AncientTabsList>
            </AncientTabs>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-parchment-300/50">
              <p className="animate-pulse font-display">Summoning the roster...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-parchment-300/40">
              <p>No souls match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    onKick={setKickTarget}
                    onBan={setBanTarget}
                    onUnban={setUnbanTarget}
                    onMessage={setMessageTarget}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollPanel>

      <ScrollPanel title="Guild Roster" icon={<Users2 />}>
        <GuildTable columns={guildColumns} rows={guildRows} rowKey={(r) => r.guild} />
      </ScrollPanel>

      <RuneDialog
        open={!!kickTarget}
        onOpenChange={(o) => !o && setKickTarget(null)}
        tone="warning"
        title="Kick this player?"
        description={`${kickTarget?.characterName} will be disconnected immediately and may reconnect at will.`}
        confirmLabel="Kick"
        onConfirm={handleKick}
        confirming={pending}
      />

      <RuneDialog
        open={!!banTarget}
        onOpenChange={(o) => !o && setBanTarget(null)}
        tone="danger"
        title="Banish this player?"
        description={`${banTarget?.characterName} will be permanently barred from the realm until unbanned.`}
        confirmLabel="Ban"
        onConfirm={handleBan}
        confirming={pending}
      />

      <RuneDialog
        open={!!unbanTarget}
        onOpenChange={(o) => !o && setUnbanTarget(null)}
        tone="info"
        title="Lift this ban?"
        description={`${unbanTarget?.characterName} will be permitted to rejoin the realm.`}
        confirmLabel="Unban"
        onConfirm={handleUnban}
        confirming={pending}
      />

      <Dialog open={!!messageTarget} onOpenChange={(o) => !o && setMessageTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Whisper to {messageTarget?.characterName}</DialogTitle>
          </DialogHeader>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            autoFocus
          />
          <DialogFooter>
            <RuneButton variant="ghost" onClick={() => setMessageTarget(null)} disabled={pending}>
              Cancel
            </RuneButton>
            <RuneButton variant="mana" onClick={handleSendMessage} disabled={pending || !messageText.trim()}>
              {pending ? "Sending..." : "Send"}
            </RuneButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
