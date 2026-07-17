import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { PlayerCard } from "@/components/players/PlayerCard";
import { useActiveQuestStep } from "@/hooks/useActiveQuestStep";
import { completeQuestStep } from "@/lib/questCompletion";
import { useNotifications } from "@/hooks/useNotifications";
import type { Player } from "@/types/models";

const LAMBALL: Player = {
  id: "training-lamball",
  characterName: "Captain Lamball",
  steamId: "steam_00000000000000000",
  level: 12,
  guild: "Training Roster",
  pingMs: 24,
  onlineSeconds: 640,
  connectionStatus: "online",
  joinedAt: new Date().toISOString(),
  isBanned: false,
  avatarSeed: "lamball",
};

/** A fake, academy-only roster entry for Admin Basics' kick_training lesson -
 * reuses the real PlayerCard component (same look, same right-click-style
 * dropdown -> Kick action as the live Roster) so the simulation matches the
 * real thing exactly, just without ever touching Palworld's real player
 * endpoint. Only renders while kick_training is genuinely the active step. */
export function TrainingRoster() {
  const { nextStep } = useActiveQuestStep();
  const notifications = useNotifications();
  const [kicked, setKicked] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (nextStep?.id !== "kick_training") return null;

  function handleConfirmKick() {
    setKicked(true);
    setConfirmOpen(false);
    notifications.success({
      title: "Captain Lamball kicked",
      message: "Nicely done - that's exactly how a real kick works, just without a real player.",
    });
    completeQuestStep("kick_training");
  }

  return (
    <ScrollPanel noPadding icon={<GraduationCap />} title="Training Roster">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-xs leading-relaxed text-parchment-300/50">
          A safe, fake entry for practicing a kick - open the menu on the card below and choose Kick, exactly like you
          would for a real player. This never touches your real server or players.
        </p>
        {kicked ? (
          <div className="flex h-40 items-center justify-center text-parchment-300/40">
            <p>Captain Lamball has been kicked.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              <PlayerCard
                key={LAMBALL.id}
                player={LAMBALL}
                onKick={() => setConfirmOpen(true)}
                onBan={() => {}}
                onUnban={() => {}}
                onMessage={() => {}}
              />
            </AnimatePresence>
          </div>
        )}
      </div>

      <RuneDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tone="warning"
        title="Kick this player?"
        description="Captain Lamball will be disconnected immediately - just like a real kick, but nothing real happens."
        confirmLabel="Kick"
        onConfirm={handleConfirmKick}
        confirming={false}
      />
    </ScrollPanel>
  );
}
