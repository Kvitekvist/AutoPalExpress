import * as React from "react";
import { BookKey, Crown, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { nexusApi } from "@/api";
import type { NexusAccount } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/hooks/useNotifications";

export function NexusIntegrationPanel() {
  const [account, setAccount] = React.useState<NexusAccount | null>(null);
  const [apiKey, setApiKey] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const notifications = useNotifications();

  React.useEffect(() => {
    nexusApi.getAccount().then(setAccount);
  }, []);

  async function handleDisconnect() {
    const acc = await nexusApi.disconnectAccount();
    setAccount(acc);
    notifications.info({
      title: "Nexus Mods key removed",
      message: "Browsing still works, but direct installs need a saved Premium key.",
    });
  }

  async function handleConnect() {
    if (!apiKey.trim()) return;
    setConnecting(true);
    try {
      const acc = await nexusApi.connectApiKey(apiKey.trim());
      setAccount(acc);
      setApiKey("");
      notifications.success({
        title: "Nexus Mods key saved",
        message: acc.isPremium
          ? "Direct Nexus installs are available."
          : "Browsing works, but direct installs require Nexus Premium.",
      });
    } catch (e) {
      notifications.error({
        title: "Nexus key failed",
        message: e instanceof Error ? e.message : "Unknown error.",
      });
    } finally {
      setConnecting(false);
    }
  }

  return (
    <ScrollPanel icon={<BookKey />} title="Nexus Mods Integration">
      <p className="mb-2 text-xs leading-relaxed text-parchment-300/50">
        Browse Nexus Mods now uses Nexus's public GraphQL metadata, so the server no longer needs the super admin's
        personal API key for browsing or verified manual installs.
      </p>
      <p className="mb-4 text-xs leading-relaxed text-gold-400/80">
        Direct Nexus installs use the saved API key and require Nexus Premium download access. Without that, download
        files on Nexus and use "Install From File" here so the exact file can be checked before install.
      </p>

      {account?.connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold-600/30 bg-gold-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold-500/50 bg-gradient-to-br from-stone-700 to-abyss-900 font-display text-base font-bold text-gold-300">
              {account.avatarInitial}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-display text-sm font-semibold text-parchment-100">{account.username}</p>
                {account.isPremium && <Crown className="h-3.5 w-3.5 text-gold-400" />}
              </div>
              <p className="text-xs text-parchment-300/50">
                {account.isPremium ? "Premium member" : "Free member"} &middot; ID {account.userId}
              </p>
            </div>
          </div>
          <RuneButton variant="ghost" size="sm" icon={<LogOut />} onClick={handleDisconnect}>
            Remove Saved Key
          </RuneButton>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-life-600/30 bg-life-500/5 px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-life-300/80">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Browsing and verified file upload work without a Nexus API key.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Nexus Mods API key for direct installs"
              type="password"
            />
            <RuneButton
              type="button"
              variant="gold"
              icon={<KeyRound />}
              onClick={handleConnect}
              disabled={connecting || !apiKey.trim()}
              className="shrink-0"
            >
              {connecting ? "Checking..." : "Save Key"}
            </RuneButton>
          </div>
        </div>
      )}
    </ScrollPanel>
  );
}
