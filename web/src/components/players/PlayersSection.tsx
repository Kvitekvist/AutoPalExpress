import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

  const unaffiliated = t("dashboard.roster.unaffiliated", { defaultValue: "Unaffiliated" });

  React.useEffect(() => {
    playersApi
      .getPlayers()
      .then((p) => setPlayers(p))
      .catch((e: Error) =>
        notifications.error({
          title: t("dashboard.roster.loadError", { defaultValue: "Couldn't load the roster" }),
          message: e.message,
        })
      )
      .finally(() => setLoading(false));
  }, [notifications, t]);

  const filtered = players.filter((p) => {
    if (filter !== "all" && p.connectionStatus !== filter) return false;
    if (search && !p.characterName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const guildRows: GuildRow[] = React.useMemo(() => {
    const groups = new Map<string, Player[]>();
    for (const p of players) {
      const key = p.guild ?? unaffiliated;
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
  }, [players, unaffiliated]);

  const guildColumns: GuildTableColumn<GuildRow>[] = [
    {
      key: "guild",
      header: t("dashboard.roster.guildColumns.guild", { defaultValue: "Guild" }),
      render: (r) => <span className="font-display font-medium text-gold-300">{r.guild}</span>,
    },
    {
      key: "members",
      header: t("dashboard.roster.guildColumns.members", { defaultValue: "Members" }),
      align: "center",
      render: (r) => r.members,
    },
    {
      key: "avgLevel",
      header: t("dashboard.roster.guildColumns.avgLevel", { defaultValue: "Avg Level" }),
      align: "center",
      render: (r) => r.avgLevel,
    },
    {
      key: "avgPing",
      header: t("dashboard.roster.guildColumns.avgPing", { defaultValue: "Avg Ping" }),
      align: "right",
      render: (r) => `${r.avgPing}ms`,
    },
  ];

  async function handleKick() {
    if (!kickTarget) return;
    setPending(true);
    try {
      const updated = await playersApi.kickPlayer(kickTarget.id);
      setPlayers(updated);
      notifications.success({
        title: t("dashboard.roster.notifications.kickedTitle", { defaultValue: "Player kicked" }),
        message: t("dashboard.roster.notifications.kickedMessage", {
          defaultValue: "{{name}} was removed from the realm.",
          name: kickTarget.characterName,
        }),
      });
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
      notifications.error({
        title: t("dashboard.roster.notifications.bannedTitle", { defaultValue: "Player banished" }),
        message: t("dashboard.roster.notifications.bannedMessage", {
          defaultValue: "{{name}} has been cast out and banned.",
          name: banTarget.characterName,
        }),
      });
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
      notifications.success({
        title: t("dashboard.roster.notifications.unbannedTitle", { defaultValue: "Ban lifted" }),
        message: t("dashboard.roster.notifications.unbannedMessage", {
          defaultValue: "{{name}} may return to the realm.",
          name: unbanTarget.characterName,
        }),
      });
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
      notifications.info({
        title: t("dashboard.roster.notifications.messageSentTitle", { defaultValue: "Message sent" }),
        message: t("dashboard.roster.notifications.messageSentMessage", {
          defaultValue: "Whisper delivered to {{name}}.",
          name: messageTarget.characterName,
        }),
      });
      setMessageTarget(null);
      setMessageText("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <ScrollPanel noPadding icon={<Users2 />} title={t("dashboard.roster.title", { defaultValue: "Roster" })}>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-300/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("dashboard.roster.searchPlaceholder", { defaultValue: "Search by character name..." })}
                className="pl-9"
              />
            </div>
            <AncientTabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <AncientTabsList>
                <AncientTabsTrigger value="all">
                  {t("dashboard.roster.tabs.all", { defaultValue: "All ({{count}})", count: players.length })}
                </AncientTabsTrigger>
                <AncientTabsTrigger value="online">
                  {t("dashboard.roster.status.online", { defaultValue: "Online" })}
                </AncientTabsTrigger>
                <AncientTabsTrigger value="idle">
                  {t("dashboard.roster.status.idle", { defaultValue: "Idle" })}
                </AncientTabsTrigger>
                <AncientTabsTrigger value="offline">
                  {t("dashboard.roster.status.offline", { defaultValue: "Offline" })}
                </AncientTabsTrigger>
              </AncientTabsList>
            </AncientTabs>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-parchment-300/50">
              <p className="animate-pulse font-display">
                {t("dashboard.roster.loading", { defaultValue: "Summoning the roster..." })}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-parchment-300/40">
              <p>{t("dashboard.roster.empty", { defaultValue: "No souls match your search." })}</p>
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

      <ScrollPanel title={t("dashboard.roster.guildRosterTitle", { defaultValue: "Guild Roster" })} icon={<Users2 />}>
        <GuildTable columns={guildColumns} rows={guildRows} rowKey={(r) => r.guild} />
      </ScrollPanel>

      <RuneDialog
        open={!!kickTarget}
        onOpenChange={(o) => !o && setKickTarget(null)}
        tone="warning"
        title={t("dashboard.roster.kickDialog.title", { defaultValue: "Kick this player?" })}
        description={t("dashboard.roster.kickDialog.description", {
          defaultValue: "{{name}} will be disconnected immediately and may reconnect at will.",
          name: kickTarget?.characterName,
        })}
        confirmLabel={t("dashboard.roster.kickDialog.confirm", { defaultValue: "Kick" })}
        onConfirm={handleKick}
        confirming={pending}
      />

      <RuneDialog
        open={!!banTarget}
        onOpenChange={(o) => !o && setBanTarget(null)}
        tone="danger"
        title={t("dashboard.roster.banDialog.title", { defaultValue: "Banish this player?" })}
        description={t("dashboard.roster.banDialog.description", {
          defaultValue: "{{name}} will be permanently barred from the realm until unbanned.",
          name: banTarget?.characterName,
        })}
        confirmLabel={t("dashboard.roster.banDialog.confirm", { defaultValue: "Ban" })}
        onConfirm={handleBan}
        confirming={pending}
      />

      <RuneDialog
        open={!!unbanTarget}
        onOpenChange={(o) => !o && setUnbanTarget(null)}
        tone="info"
        title={t("dashboard.roster.unbanDialog.title", { defaultValue: "Lift this ban?" })}
        description={t("dashboard.roster.unbanDialog.description", {
          defaultValue: "{{name}} will be permitted to rejoin the realm.",
          name: unbanTarget?.characterName,
        })}
        confirmLabel={t("dashboard.roster.unbanDialog.confirm", { defaultValue: "Unban" })}
        onConfirm={handleUnban}
        confirming={pending}
      />

      <Dialog open={!!messageTarget} onOpenChange={(o) => !o && setMessageTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("dashboard.roster.messageDialog.title", {
                defaultValue: "Whisper to {{name}}",
                name: messageTarget?.characterName,
              })}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={t("dashboard.roster.messageDialog.placeholder", { defaultValue: "Type your message..." })}
            autoFocus
          />
          <DialogFooter>
            <RuneButton variant="ghost" onClick={() => setMessageTarget(null)} disabled={pending}>
              {t("dashboard.roster.messageDialog.cancel", { defaultValue: "Cancel" })}
            </RuneButton>
            <RuneButton variant="mana" onClick={handleSendMessage} disabled={pending || !messageText.trim()}>
              {pending
                ? t("dashboard.roster.messageDialog.sending", { defaultValue: "Sending..." })
                : t("dashboard.roster.messageDialog.send", { defaultValue: "Send" })}
            </RuneButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
