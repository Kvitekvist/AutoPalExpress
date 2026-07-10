import * as React from "react";
import { useTranslation } from "react-i18next";
import { BookKey, Crown, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { nexusApi } from "@/api";
import type { NexusAccount } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/hooks/useNotifications";

export function NexusIntegrationPanel() {
  const { t } = useTranslation();
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
      title: t("superAdmin.nexus.keyRemovedTitle", { defaultValue: "Nexus Mods key removed" }),
      message: t("superAdmin.nexus.keyRemovedMessage", { defaultValue: "Browsing still works, but direct installs need a saved Premium key." }),
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
        title: t("superAdmin.nexus.keySavedTitle", { defaultValue: "Nexus Mods key saved" }),
        message: acc.isPremium
          ? t("superAdmin.nexus.directInstallsAvailable", { defaultValue: "Direct Nexus installs are available." })
          : t("superAdmin.nexus.needsPremium", { defaultValue: "Browsing works, but direct installs require Nexus Premium." }),
      });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.nexus.keyFailedTitle", { defaultValue: "Nexus key failed" }),
        message: e instanceof Error ? e.message : t("superAdmin.nexus.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setConnecting(false);
    }
  }

  return (
    <ScrollPanel icon={<BookKey />} title={t("superAdmin.nexus.title", { defaultValue: "Nexus Mods Integration" })}>
      <p className="mb-2 text-xs leading-relaxed text-parchment-300/50">
        {t("superAdmin.nexus.description1", {
          defaultValue:
            "Browse Nexus Mods now uses Nexus's public GraphQL metadata, so the server no longer needs the super admin's personal API key for browsing or verified manual installs.",
        })}
      </p>
      <p className="mb-4 text-xs leading-relaxed text-gold-400/80">
        {t("superAdmin.nexus.description2", {
          defaultValue:
            'Direct Nexus installs use the saved API key and require Nexus Premium download access. Without that, download files on Nexus and use "Install From File" here so the exact file can be checked before install.',
        })}
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
                {account.isPremium
                  ? t("superAdmin.nexus.premiumMember", { defaultValue: "Premium member" })
                  : t("superAdmin.nexus.freeMember", { defaultValue: "Free member" })}{" "}
                &middot; {t("superAdmin.nexus.idLabel", { defaultValue: "ID {{id}}", id: account.userId })}
              </p>
            </div>
          </div>
          <RuneButton variant="ghost" size="sm" icon={<LogOut />} onClick={handleDisconnect}>
            {t("superAdmin.nexus.removeSavedKey", { defaultValue: "Remove Saved Key" })}
          </RuneButton>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-life-600/30 bg-life-500/5 px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-life-300/80">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {t("superAdmin.nexus.worksWithoutKey", { defaultValue: "Browsing and verified file upload work without a Nexus API key." })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={t("superAdmin.nexus.apiKeyPlaceholder", { defaultValue: "Nexus Mods API key for direct installs" })}
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
              {connecting ? t("superAdmin.nexus.checking", { defaultValue: "Checking..." }) : t("superAdmin.nexus.saveKey", { defaultValue: "Save Key" })}
            </RuneButton>
          </div>
        </div>
      )}
    </ScrollPanel>
  );
}
