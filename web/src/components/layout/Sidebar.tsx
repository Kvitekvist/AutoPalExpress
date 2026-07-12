import * as React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, BookOpen, Swords, ScrollText, Settings2, Flame, SlidersHorizontal, Crown, Rocket, Heart, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { appUpdateApi } from "@/api";
import type { AppUpdateStatus } from "@/types/models";

const COMMON_ITEMS = [
  { to: "/", labelKey: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/mods", labelKey: "mods", icon: BookOpen },
  { to: "/control", labelKey: "control", icon: Swords },
  { to: "/world-settings", labelKey: "worldSettings", icon: SlidersHorizontal },
  { to: "/logs", labelKey: "logs", icon: ScrollText },
];

const HOST_ITEMS = [
  { to: "/launcher-options", labelKey: "launcherOptions", icon: Rocket },
  { to: "/settings", labelKey: "settings", icon: Settings2 },
  { to: "/super-admin", labelKey: "superAdmin", icon: Crown },
];

function NavItem({ to, end, labelKey, icon: Icon, host }: { to: string; end?: boolean; labelKey: string; icon: typeof Crown; host?: boolean }) {
  const { t } = useTranslation();
  return (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <div
          className={cn(
            "group relative flex items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors lg:px-3.5",
            isActive ? "text-gold-300" : host ? "text-gold-100/70 hover:text-gold-200" : "text-parchment-300/60 hover:text-parchment-100"
          )}
        >
          {isActive && (
            <motion.div
              layoutId="nav-active"
              className={cn(
                "absolute inset-0 rounded-md border bg-gradient-to-r to-transparent",
                host
                  ? "border-gold-500/60 from-gold-500/20 shadow-[inset_0_0_14px_rgba(223,177,90,0.25)]"
                  : "border-gold-600/40 from-gold-600/15 shadow-[inset_0_0_12px_rgba(223,177,90,0.15)]"
              )}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <span
            className={cn(
              "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
              isActive
                ? "border-gold-500/60 bg-gold-500/10 shadow-rune-gold"
                : host
                  ? "border-gold-600/50 bg-gold-950/30 group-hover:border-gold-400/60"
                  : "border-stone-600 group-hover:border-gold-600/40"
            )}
          >
            <Icon className="h-4 w-4" />
            {host && (
              <span
                className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-abyss-950 bg-gradient-to-br from-gold-300 to-gold-600 shadow-[0_0_4px_rgba(223,177,90,0.8)]"
                title={t("nav.hostOnlyBadge", { defaultValue: "Visible to the super admin only" })}
              >
                <Crown className="h-2 w-2 text-abyss-950" strokeWidth={3} />
              </span>
            )}
          </span>
          <span className="relative hidden min-w-0 flex-1 items-center gap-1.5 truncate font-display text-sm font-medium tracking-wide lg:flex">
            <span className="truncate">{t(`nav.${labelKey}`)}</span>
          </span>
        </div>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isSuperAdmin = user.role === "super_admin";
  const [updateStatus, setUpdateStatus] = React.useState<AppUpdateStatus | null>(null);

  React.useEffect(() => {
    appUpdateApi.getStatus().then(setUpdateStatus).catch(() => {});
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[76px] flex-col border-r border-stone-700/80 bg-gradient-to-b from-stone-900 via-abyss-900 to-abyss-950 bg-noise lg:w-64">
      <div className="flex h-20 items-center justify-center gap-3 border-b border-stone-700/80 px-2 lg:justify-start lg:px-6">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold-500/60 bg-gradient-to-br from-stone-800 to-abyss-900">
          <div className="absolute inset-0 rounded-full bg-gold-500/25 blur-md animate-glow-pulse" />
          <Flame className="relative h-5 w-5 text-gold-400" />
        </div>
        <div className="hidden lg:block">
          <p className="font-display text-sm font-bold tracking-wide text-gradient-gold">AutoPalExpress</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-parchment-300/40">Server Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-2 py-5 lg:px-3">
        {COMMON_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {isSuperAdmin && (
          <>
            <div className="my-3 flex items-center gap-2 rounded-md border border-gold-600/30 bg-gold-500/[0.06] px-2.5 py-1.5 lg:px-3.5">
              <Crown className="h-3.5 w-3.5 shrink-0 text-gold-400" />
              <span className="hidden whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.15em] text-gold-400 lg:inline">
                {t("nav.hostControls", { defaultValue: "Host Controls" })}
              </span>
            </div>
            {HOST_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} host />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-stone-700/80 p-2 lg:p-4">
        {updateStatus?.updateAvailable && updateStatus.releaseUrl && (
          <a
            href={updateStatus.releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-md border border-gold-700/35 bg-gold-950/20 px-2 py-2 text-gold-300/70 transition-colors hover:border-gold-500/50 hover:text-gold-200 lg:justify-start lg:px-3"
            title={t("nav.updateAvailableTitle", {
              defaultValue: "AutoPalExpress {{version}} is available on GitHub",
              version: updateStatus.latestVersion,
            })}
          >
            <span className="relative">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-gold-400 shadow-[0_0_5px_rgba(223,177,90,0.8)]" />
            </span>
            <span className="hidden text-[11px] font-medium tracking-wide lg:inline">
              {t("nav.updateAvailable", { defaultValue: "Update available" })}
            </span>
          </a>
        )}
        <form action="https://www.paypal.com/donate" method="post" target="_blank">
          <input type="hidden" name="business" value="U6FYTKUFFE82W" />
          <input type="hidden" name="no_recurring" value="0" />
          <input type="hidden" name="item_name" value="AutoPalExpress" />
          <input type="hidden" name="currency_code" value="NOK" />
          <button
            type="submit"
            className="group flex w-full items-center justify-center gap-2 rounded-md border border-stone-700/80 bg-stone-900/30 px-2 py-2 text-parchment-300/35 transition-colors hover:border-gold-700/40 hover:bg-gold-950/20 hover:text-gold-300/65 lg:justify-start lg:px-3"
            title={t("nav.donateTitle", { defaultValue: "Support AutoPalExpress with a PayPal donation" })}
            aria-label={t("nav.donateTitle", { defaultValue: "Support AutoPalExpress with a PayPal donation" })}
          >
            <Heart className="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-gold-400/70" />
            <span className="hidden text-[11px] font-medium tracking-wide lg:inline">
              {t("nav.donate", { defaultValue: "Support the project" })}
            </span>
          </button>
        </form>
        <p className="mt-2 hidden text-[10px] leading-relaxed text-parchment-300/25 lg:block">
          AutoPalExpress &middot; v{updateStatus?.currentVersion ?? "..."}
        </p>
      </div>
    </aside>
  );
}
