import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrbAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "gold" | "mana" | "life" | "danger";
}

interface FloatingActionOrbProps {
  actions: OrbAction[];
}

const VARIANT_RING: Record<string, string> = {
  gold: "border-gold-500/50 text-gold-300 hover:shadow-rune-gold",
  mana: "border-mana-500/50 text-mana-300 hover:shadow-rune-mana",
  life: "border-life-500/50 text-life-300 hover:shadow-rune-life",
  danger: "border-blood-500/50 text-blood-300 hover:shadow-rune-blood",
};

export function FloatingActionOrb({ actions }: FloatingActionOrbProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open &&
          actions.map((action, i) => (
            <motion.button
              key={action.key}
              initial={{ opacity: 0, y: 12, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.85 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border bg-abyss-900/95 bg-noise px-4 py-2.5 text-sm font-medium shadow-lg shadow-black/40 backdrop-blur-sm transition-shadow",
                VARIANT_RING[action.variant ?? "gold"]
              )}
            >
              <span className="[&_svg]:h-4 [&_svg]:w-4">{action.icon}</span>
              {action.label}
            </motion.button>
          ))}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-500/60 bg-gradient-to-br from-stone-800 to-abyss-900 text-gold-300 shadow-rune-gold"
      >
        <div className="absolute inset-0 rounded-full bg-gold-500/20 blur-md animate-glow-pulse" />
        <motion.span animate={{ rotate: open ? 135 : 0 }} transition={{ duration: 0.25 }} className="relative">
          {open ? <X className="h-6 w-6" /> : <Wand2 className="h-6 w-6" />}
        </motion.span>
      </motion.button>
    </div>
  );
}
