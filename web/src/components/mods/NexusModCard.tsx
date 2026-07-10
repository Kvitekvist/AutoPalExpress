import { Download, Check, ThumbsUp, ExternalLink, BookOpen, ShieldCheck, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SpellCard } from "@/components/fantasy/SpellCard";
import type { NexusModResult } from "@/types/models";

interface NexusModCardProps {
  mod: NexusModResult;
  installed: boolean;
  canInstallFromFile: boolean;
  canDirectInstall: boolean;
  directInstallUnavailableReason?: string | null;
  installing: boolean;
  onInstall: () => void;
}

export function NexusModCard({
  mod,
  installed,
  canInstallFromFile,
  canDirectInstall,
  directInstallUnavailableReason,
  installing,
  onInstall,
}: NexusModCardProps) {
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
        ) : canInstallFromFile ? (
          <>
            <button
              type="button"
              onClick={onInstall}
              disabled={installing || !canDirectInstall}
              className="flex min-w-[132px] flex-1 items-center justify-center gap-1.5 rounded-md border border-life-600/30 bg-life-500/5 px-3 py-2 text-xs font-medium text-life-300/80 transition-colors hover:border-life-400/50 hover:text-life-200 disabled:pointer-events-none disabled:opacity-50"
              title={
                canDirectInstall
                  ? t("mods.nexusCard.directInstallTooltip", {
                      defaultValue: "Download directly from Nexus and install into the active server's Mods folder.",
                    })
                  : directInstallUnavailableReason ?? t("mods.nexusCard.needsPremiumKey", { defaultValue: "Direct install needs a saved Nexus Premium API key." })
              }
            >
              <Download className="h-3.5 w-3.5" />
              {installing ? t("mods.nexusCard.installing", { defaultValue: "Installing..." }) : t("mods.nexusCard.directInstall", { defaultValue: "Direct Install" })}
            </button>
            <Link
              to="/super-admin"
              className="flex min-w-[132px] flex-1 items-center justify-center gap-1.5 rounded-md border border-stone-600 px-3 py-2 text-xs font-medium text-parchment-300/70 transition-colors hover:border-gold-600/40 hover:text-gold-300"
              title={t("mods.nexusCard.installFileTooltip", { defaultValue: "Download this file on Nexus first, then upload it in Super Admin." })}
            >
              <Upload className="h-3.5 w-3.5" />
              {t("mods.nexusCard.installFile", { defaultValue: "Install File" })}
            </Link>
          </>
        ) : (
          <span
            className="flex min-w-[132px] flex-1 items-center justify-center gap-1.5 rounded-md border border-stone-600/60 bg-stone-800/20 px-3 py-2 text-xs font-medium text-parchment-300/55"
            title={t("mods.nexusCard.superAdminOnlyTooltip", { defaultValue: "Only the super admin can install downloaded mod files." })}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("mods.nexusCard.superAdminOnly", { defaultValue: "Super Admin Only" })}
          </span>
        )}
      </div>
      {!installed && (
        <p className="mt-2 text-[11px] leading-relaxed text-parchment-300/40">
          {canDirectInstall
            ? t("mods.nexusCard.hintDirect", { defaultValue: "Direct install uses your saved Nexus key and Premium download access." })
            : canInstallFromFile
              ? `${directInstallUnavailableReason ?? t("mods.nexusCard.needsPremiumKey", { defaultValue: "Direct install needs a saved Nexus Premium API key." })} ${t("mods.nexusCard.hintFileAvailable", { defaultValue: "You can still use Install File after downloading." })}`
              : t("mods.nexusCard.hintViewThenAsk", {
                  defaultValue: '"View on Nexus" opens the download page. After downloading, ask the super admin to use Install From File.',
                })}
        </p>
      )}
    </SpellCard>
  );
}
