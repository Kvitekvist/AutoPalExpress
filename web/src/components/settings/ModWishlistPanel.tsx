import * as React from "react";
import { Check, ExternalLink, Heart, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { modsApi } from "@/api";
import type { ModWishlistRequest } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

export function ModWishlistPanel() {
  const { t } = useTranslation();
  const notifications = useNotifications();
  const [requests, setRequests] = React.useState<ModWishlistRequest[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    modsApi.getWishlist().then(setRequests);
  }, []);

  async function decide(request: ModWishlistRequest, approve: boolean) {
    setBusyId(request.id);
    try {
      const updated = approve
        ? await modsApi.approveWishlistRequest(request.id)
        : await modsApi.denyWishlistRequest(request.id);
      setRequests(updated);
      notifications.success({
        title: approve
          ? t("superAdmin.modWishlist.approvedTitle", { defaultValue: "Mod approved and installed" })
          : t("superAdmin.modWishlist.deniedTitle", { defaultValue: "Mod request denied" }),
        message: request.name,
      });
    } catch (error) {
      notifications.error({
        title: t("superAdmin.modWishlist.actionFailed", { defaultValue: "Could not process request" }),
        message: error instanceof Error ? error.message : t("common.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollPanel icon={<Heart />} title={t("superAdmin.modWishlist.title", { defaultValue: "Mod Wishlist" })}>
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        {t("superAdmin.modWishlist.description", {
          defaultValue: "Admins can request mods using public Nexus information. Your saved Nexus key is only used after you approve a request here.",
        })}
      </p>
      {requests.length === 0 ? (
        <p className="rounded-md border border-stone-700 bg-abyss-950/30 px-4 py-8 text-center text-sm text-parchment-300/45">
          {t("superAdmin.modWishlist.empty", { defaultValue: "No mod requests are waiting." })}
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="flex flex-col gap-3 rounded-md border border-stone-700 bg-abyss-950/35 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-display text-sm font-semibold text-parchment-100">{request.name}</h4>
                  <a href={request.nexusUrl} target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300" title="View on Nexus">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="mt-1 text-xs text-parchment-300/55">
                  {t("superAdmin.modWishlist.requestedBy", { defaultValue: "Requested by {{username}}", username: request.requestedBy })}
                </p>
                {request.summary && <p className="mt-2 line-clamp-2 text-xs text-parchment-300/65">{request.summary}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <RuneButton size="sm" variant="life" icon={<Check />} disabled={busyId != null} onClick={() => decide(request, true)}>
                  {busyId === request.id ? t("common.working", { defaultValue: "Working..." }) : t("superAdmin.modWishlist.approve", { defaultValue: "Approve" })}
                </RuneButton>
                <RuneButton size="sm" variant="danger" icon={<X />} disabled={busyId != null} onClick={() => decide(request, false)}>
                  {t("superAdmin.modWishlist.deny", { defaultValue: "Deny" })}
                </RuneButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollPanel>
  );
}
