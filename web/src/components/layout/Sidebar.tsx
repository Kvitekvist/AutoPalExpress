import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, BookOpen, Swords, ScrollText, Settings2, Flame, SlidersHorizontal, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/mods", label: "Mods", icon: BookOpen },
  { to: "/control", label: "Server Control", icon: Swords },
  { to: "/world-settings", label: "World Settings", icon: SlidersHorizontal },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings2, superAdminOnly: true },
  { to: "/super-admin", label: "Super Admin", icon: Crown, superAdminOnly: true },
];

export function Sidebar() {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.superAdminOnly || user.role === "super_admin");

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
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {({ isActive }) => (
              <div
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors lg:px-3.5",
                  isActive ? "text-gold-300" : "text-parchment-300/60 hover:text-parchment-100"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md border border-gold-600/40 bg-gradient-to-r from-gold-600/15 to-transparent shadow-[inset_0_0_12px_rgba(223,177,90,0.15)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isActive
                      ? "border-gold-500/60 bg-gold-500/10 shadow-rune-gold"
                      : "border-stone-600 group-hover:border-gold-600/40"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="relative hidden truncate font-display text-sm font-medium tracking-wide lg:block">
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-stone-700/80 p-4 lg:block">
        <p className="text-[10px] leading-relaxed text-parchment-300/30">
          AutoPalExpress &middot; v0.1.0
        </p>
      </div>
    </aside>
  );
}
