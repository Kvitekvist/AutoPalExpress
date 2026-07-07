import * as React from "react";
import { BookKey, Crown, LogOut, TriangleAlert, Eye, EyeOff } from "lucide-react";
import { nexusApi } from "@/api";
import type { NexusAccount } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

export function NexusIntegrationPanel() {
  const [account, setAccount] = React.useState<NexusAccount | null>(null);
  const [apiKey, setApiKey] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const notifications = useNotifications();

  React.useEffect(() => {
    nexusApi.getAccount().then(setAccount);
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const acc = await nexusApi.connectApiKey(apiKey);
      setAccount(acc);
      setApiKey("");
      notifications.success({
        title: "Nexus Mods linked",
        message: `Connected as ${acc.username}${acc.isPremium ? " (Premium)" : ""}.`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to connect.";
      setError(message);
      notifications.error({ title: "Connection failed", message });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    const acc = await nexusApi.disconnectAccount();
    setAccount(acc);
    notifications.info({ title: "Nexus Mods unlinked", message: "Mod search and install has been disabled." });
  }

  return (
    <ScrollPanel icon={<BookKey />} title="Nexus Mods Integration">
      <p className="mb-2 text-xs leading-relaxed text-parchment-300/50">
        Link the super admin's Nexus Mods API key here to unlock "Browse Nexus Mods" on the Mods page for the server.
        Find your personal API key on your Nexus Mods account's API Access settings page.
      </p>
      <p className="mb-4 text-xs leading-relaxed text-gold-400/80">
        One-click automatic installs require <strong>Nexus Mods Premium</strong>, a paid subscription (Nexus's
        requirement, not this tool's). Free accounts can still connect, browse, and search; installing then means
        downloading the file yourself and using "Install From File" here in Super Admin instead.
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
            Disconnect
          </RuneButton>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nexus-key">Nexus Mods API Key</Label>
            <div className="relative">
              <Input
                id="nexus-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your personal API key..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment-300/40 hover:text-gold-400"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-blood-600/30 bg-blood-500/5 px-3 py-2 text-xs text-blood-400">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          <RuneButton variant="gold" onClick={handleConnect} disabled={connecting || !apiKey.trim()}>
            {connecting ? "Verifying..." : "Connect"}
          </RuneButton>
        </div>
      )}
    </ScrollPanel>
  );
}
