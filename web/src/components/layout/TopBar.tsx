import * as React from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, Server as ServerIcon, ChevronDown, Plus, UserCircle2, LogOut } from "lucide-react";
import { CrystalStatus } from "@/components/fantasy/CrystalStatus";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useAuth } from "@/hooks/useAuth";
import { instancesApi } from "@/api";
import type { InstanceListView } from "@/types/models";
import { DeployServerWizard } from "@/components/settings/DeployServerWizard";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PAGE_KEYS: Record<string, string> = {
  "/": "dashboard",
  "/mods": "mods",
  "/control": "control",
  "/world-settings": "worldSettings",
  "/launcher-options": "launcherOptions",
  "/logs": "logs",
  "/settings": "settings",
  "/super-admin": "superAdmin",
  "/mod-wishlist": "modWishlist",
};

function InstanceSwitcher() {
  const { t } = useTranslation();
  const [data, setData] = React.useState<InstanceListView | null>(null);
  const [deployOpen, setDeployOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let timer: number;

    async function tick() {
      const next = await instancesApi.list();
      if (cancelled) return;
      setData(next);
      // The installer's seeded first server can still be deploying (SteamCMD
      // download) after the browser opens, so keep polling until an instance
      // actually shows up instead of leaving a stale "no servers" state that
      // only a manual page refresh would fix.
      if (next.instances.length === 0) {
        timer = window.setTimeout(tick, 3000);
      }
    }
    tick();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function handleSwitch(id: string) {
    if (id === data?.activeId) return;
    await instancesApi.setActive(id);
    // Every page reads the active instance independently on mount - reload so they all pick it up.
    window.location.reload();
  }

  const active = data?.instances.find((i) => i.id === data.activeId);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <span className="hidden whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-parchment-300/60 md:inline">
          {t("topbar.instanceSwitcher.currentServer")}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex max-w-[20rem] items-center gap-2.5 rounded-lg border-2 border-gold-600/50 bg-gradient-to-b from-stone-800 to-abyss-900 px-4 py-2.5 text-sm font-semibold text-parchment-100 shadow-rune-gold transition-colors hover:border-gold-400 hover:text-gold-200">
              <ServerIcon className="h-5 w-5 shrink-0 text-gold-400" />
              <span className="truncate">{active ? active.name : t("topbar.instanceSwitcher.noServerSelected")}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {data?.instances.length ? (
              data.instances.map((instance) => (
                <DropdownMenuItem key={instance.id} onSelect={() => handleSwitch(instance.id)}>
                  {instance.id === data.activeId ? "✓ " : ""}
                  {instance.name}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>{t("topbar.instanceSwitcher.noServersYet")}</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDeployOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> {t("topbar.instanceSwitcher.newServer")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeployServerWizard open={deployOpen} onOpenChange={setDeployOpen} onDeployed={() => window.location.reload()} />
    </>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-xs text-parchment-200 transition-colors hover:border-gold-600/50 hover:text-gold-300">
          <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-gold-500/80" />
          <span className="max-w-[8rem] truncate">{user.username}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>
          {user.role === "super_admin" ? t("topbar.userMenu.superAdmin") : t("topbar.userMenu.admin")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => logout()}>
          <LogOut className="h-3.5 w-3.5" /> {t("topbar.userMenu.logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar() {
  const location = useLocation();
  const { status } = useServerStatus();
  const { t } = useTranslation();
  const pageKey = PAGE_KEYS[location.pathname] ?? PAGE_KEYS["/"];

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-4 border-b border-stone-700/80 bg-abyss-900/80 bg-noise px-5 backdrop-blur-md lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-semibold text-gradient-gold">
          {t(`topbar.pages.${pageKey}.title`)}
        </h1>
        <p className="truncate text-xs text-parchment-300/50">{t(`topbar.pages.${pageKey}.subtitle`)}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <InstanceSwitcher />
        {status && (
          <>
            <div className="hidden items-center gap-2 rounded-md border border-stone-700 bg-stone-900/50 px-3 py-1.5 sm:flex">
              <Users className="h-3.5 w-3.5 text-gold-500/80" />
              <span className="font-mono text-xs text-parchment-200">
                {status.playersOnline}/{status.maxPlayers}
              </span>
            </div>
            <CrystalStatus state={status.state} size="sm" label={t(`serverControl.states.${status.state}`, { defaultValue: status.state })} />
          </>
        )}
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
