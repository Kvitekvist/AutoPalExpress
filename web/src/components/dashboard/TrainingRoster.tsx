import * as React from "react";
import { GraduationCap, DoorOpen } from "lucide-react";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useActiveQuestStep } from "@/hooks/useActiveQuestStep";
import { completeQuestStep } from "@/lib/questCompletion";
import { useNotifications } from "@/hooks/useNotifications";

/** A fake, academy-only roster entry (Captain Lamball) for Admin Basics'
 * kick_training lesson - lets a new admin safely practice a kick without
 * ever touching Palworld's real player endpoint. Only renders while
 * kick_training is genuinely the active step. */
export function TrainingRoster() {
  const { nextStep } = useActiveQuestStep();
  const notifications = useNotifications();
  const [kicked, setKicked] = React.useState(false);

  if (nextStep?.id !== "kick_training") return null;

  function handleKick() {
    setKicked(true);
    notifications.success({
      title: "Captain Lamball kicked",
      message: "Nicely done - that's exactly how a real kick works, just without a real player.",
    });
    completeQuestStep("kick_training");
  }

  return (
    <ScrollPanel icon={<GraduationCap />} title="Training Roster">
      <div className="space-y-3 p-5">
        <p className="text-xs leading-relaxed text-parchment-300/50">
          A safe, fake entry for practicing a kick. This never touches your real server or players.
        </p>
        {kicked ? (
          <p className="rounded-md border border-stone-700 bg-abyss-950/30 px-4 py-6 text-center text-sm text-parchment-300/45">
            Captain Lamball has been kicked.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-700 bg-gradient-to-b from-stone-800/80 to-abyss-900/90 bg-noise p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-gold-600/40 bg-gradient-to-br from-stone-700 to-abyss-900 font-display text-lg font-bold text-gold-300">
                L
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-parchment-100">Captain Lamball</p>
                <p className="text-xs text-parchment-300/45">Academy trainee - not a real player</p>
              </div>
            </div>
            <RuneButton variant="danger" size="sm" icon={<DoorOpen />} onClick={handleKick}>
              Kick
            </RuneButton>
          </div>
        )}
      </div>
    </ScrollPanel>
  );
}
