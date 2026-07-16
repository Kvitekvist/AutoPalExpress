import * as React from "react";
import { useTranslation } from "react-i18next";
import { BookKey, Crown, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { nexusApi } from "@/api";
import type { NexusAccount } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

export function NexusIntegrationPanel() {
  const { t } = useTranslation();
  const [account, setAccount] = React.useState<NexusAccount | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const notifications = useNotifications();

  React.useEffect(() => {
    nexusApi.getAccount().then(setAccount);
  }, []);

  async function handleDisconnect() {
    const acc = await nexusApi.disconnectAccount();
    setAccount(acc);
    notifications.info({
      title: t("superAdmin.nexus.disconnectedTitle", { defaultValue: "Nexus Mods disconnected" }),
      message: t("superAdmin.nexus.disconnectedMessage", {
        defaultValue: "Browsing still works, but direct installs need reconnecting.",
      }),
    });
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { requestId, authorizeUrl } = await nexusApi.startSso();
      window.open(authorizeUrl, "_blank", "noopener,noreferrer");

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        const result = await nexusApi.getSsoStatus(requestId);
        if (result.status === "connected") {
          setAccount(result.account);
          notifications.success({
            title: t("superAdmin.nexus.connectedTitle", { defaultValue: "Nexus Mods connected" }),
            message: result.account.isPremium
              ? t("superAdmin.nexus.directInstallsAvailable", { defaultValue: "Direct Nexus installs are available." })
              : t("superAdmin.nexus.needsPremium", {
                  defaultValue: "Browsing works, but direct installs require Nexus Premium.",
                }),
          });
          return;
        }
        if (result.status === "error") {
          notifications.error({
            title: t("superAdmin.nexus.connectFailedTitle", { defaultValue: "Nexus Mods connection failed" }),
            message: result.message,
          });
          return;
        }
      }
      notifications.error({
        title: t("superAdmin.nexus.connectTimedOutTitle", { defaultValue: "Nexus Mods connection timed out" }),
        message: t("superAdmin.nexus.connectTimedOutMessage", {
          defaultValue: "The approval window closed. Try connecting again.",
        }),
      });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.nexus.connectFailedTitle", { defaultValue: "Nexus Mods connection failed" }),
        message:
          e instanceof Error ? e.message : t("superAdmin.nexus.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setConnecting(false);
    }
  }

  return (
    <ScrollPanel icon={<BookKey />} title={t("superAdmin.nexus.title", { defaultValue: "Nexus Mods Integration" })}>
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        {t("superAdmin.nexus.description1", {
          defaultValue:
            "Browsing and verified manual installs use Nexus's public metadata and need no connection at all. Nexus Login below only unlocks Direct Install (and requires Nexus Premium download access).",
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
            {t("superAdmin.nexus.disconnect", { defaultValue: "Disconnect" })}
          </RuneButton>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-life-600/30 bg-life-500/5 px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-life-300/80">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {t("superAdmin.nexus.worksWithoutKey", {
              defaultValue: "Browsing and verified file upload work without connecting anything.",
            })}
          </div>
          <RuneButton
            type="button"
            variant="gold"
            icon={<LogIn />}
            onClick={handleConnect}
            disabled={connecting}
            className="w-full"
          >
            {connecting
              ? t("superAdmin.nexus.waitingForApproval", { defaultValue: "Waiting for approval on Nexus Mods..." })
              : t("superAdmin.nexus.connect", { defaultValue: "Nexus Login" })}
          </RuneButton>
          <p className="text-[11px] leading-relaxed text-parchment-300/40">
            {t("superAdmin.nexus.connectHint", {
              defaultValue:
                "Opens a Nexus Mods tab where you log in and approve AutoPalExpress - no key to copy or paste.",
            })}
          </p>
        </div>
      )}
    </ScrollPanel>
  );
}
