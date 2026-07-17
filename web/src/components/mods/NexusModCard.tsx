import { Download, Check, ThumbsUp, ExternalLink, BookOpen, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SpellCard } from "@/components/fantasy/SpellCard";
import { QuestSpotlight } from "@/components/university/QuestSpotlight";
import type { NexusModResult } from "@/types/models";

interface NexusModCardProps {
  mod: NexusModResult;
  installed: boolean;
  requested: boolean;
  requesting: boolean;
  onRequest: () => void;
}

export function NexusModCard({ mod, installed, requested, requesting, onRequest }: NexusModCardProps) {
  const { t } = useTranslation();
  return (
    <SpellCard status="neutral" className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-600 bg-stone-800">
          {mod.pictureUrl ? (
            <img src={mod.pictureUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <BookOpen className="h-5 w-5 text-gold-500/50" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base font-semibold leading-snug text-parchment-100">{mod.name}</h3>
            <span className="shrink-0 rounded-full border border-gold-600/30 bg-gold-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold-400/90">
              {mod.categoryName}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-parchment-300/50">
            {t("mods.nexusCard.byAuthor", { defaultValue: "by {{author}}", author: mod.author })}
          </p>
        </div>
      </div>

      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-parchment-300/75">{mod.summary}</p>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-parchment-300/40">
        <span className="flex items-center gap-1">
          <Download className="h-3 w-3" /> {mod.downloads.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3 w-3" /> {mod.endorsements.toLocaleString()}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={mod.nexusUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-[132px] flex-1 items-center justify-center gap-1.5 rounded-md border border-stone-600 px-3 py-2 text-xs font-medium text-parchment-300/70 transition-colors hover:border-gold-600/40 hover:text-gold-300"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {t("mods.nexusCard.viewOnNexus", { defaultValue: "View on Nexus" })}
        </a>
        {installed ? (
          <span className="flex min-w-[132px] flex-1 items-center justify-center gap-1.5 rounded-md border border-life-600/30 bg-life-500/5 px-3 py-2 text-xs font-medium text-life-300/80">
            <Check className="h-3.5 w-3.5" />
            {t("mods.nexusCard.installed", { defaultValue: "Installed" })}
          </span>
        ) : requested ? (
          <span className="flex min-w-[132px] flex-1 items-center justify-center gap-1.5 rounded-md border border-gold-600/30 bg-gold-500/5 px-3 py-2 text-xs font-medium text-gold-300/80">
            <Check className="h-3.5 w-3.5" />
            {t("mods.nexusCard.requested", { defaultValue: "Requested" })}
          </span>
        ) : (
          <QuestSpotlight stepId={["wishlist_one", "wishlist_mod"]} className="min-w-[132px] flex-1">
            <button
              type="button"
              onClick={onRequest}
              disabled={requesting}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-gold-600/30 bg-gold-500/5 px-3 py-2 text-xs font-medium text-gold-300/80 transition-colors hover:border-gold-400/50 hover:text-gold-200 disabled:pointer-events-none disabled:opacity-50"
              title={t("mods.nexusCard.wishlistTooltip", {
                defaultValue: "Ask the super admin to approve and install this mod.",
              })}
            >
              <Heart className="h-3.5 w-3.5" />
              {requesting
                ? t("mods.nexusCard.requesting", { defaultValue: "Requesting..." })
                : t("mods.nexusCard.addToWishlist", { defaultValue: "Add to Wishlist" })}
            </button>
          </QuestSpotlight>
        )}
      </div>
      {!installed && (
        <p className="mt-2 text-[11px] leading-relaxed text-parchment-300/40">
          {requested
            ? t("mods.nexusCard.hintRequested", {
                defaultValue: "Waiting for the super admin to approve or deny this request.",
              })
            : t("mods.nexusCard.hintWishlist", {
                defaultValue: "Add this mod to the server wishlist for the super admin to review.",
              })}
        </p>
      )}
    </SpellCard>
  );
}
