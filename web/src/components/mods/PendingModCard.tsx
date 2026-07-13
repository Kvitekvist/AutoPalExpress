import { useTranslation } from "react-i18next";
import { ExternalLink, Hourglass, User } from "lucide-react";
import type { ModWishlistRequest } from "@/types/models";
import { SpellCard } from "@/components/fantasy/SpellCard";

interface PendingModCardProps {
  request: ModWishlistRequest;
}

export function PendingModCard({ request }: PendingModCardProps) {
  const { t } = useTranslation();
  return (
    <SpellCard status="neutral" className="opacity-90">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-parchment-100">{request.name}</h3>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-gold-600/40 bg-gold-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-300">
              <Hourglass className="h-3 w-3" />
              {t("mods.card.pendingInstall", { defaultValue: "Pending Install" })}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-parchment-300/50">
            <User className="h-3 w-3" /> {request.author}
          </div>
          {request.summary && <p className="mt-2.5 text-sm leading-relaxed text-parchment-300/75">{request.summary}</p>}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-700/60 pt-3 text-xs text-parchment-300/50">
            <span>
              {t("mods.card.pendingInstallHint", {
                defaultValue: "Requested by {{username}} - waiting for super-admin approval.",
                username: request.requestedBy,
              })}
            </span>
            <a
              href={request.nexusUrl}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-1 text-gold-400 hover:text-gold-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("mods.nexusCard.viewOnNexus", { defaultValue: "View on Nexus" })}
            </a>
          </div>
        </div>
      </div>
    </SpellCard>
  );
}
