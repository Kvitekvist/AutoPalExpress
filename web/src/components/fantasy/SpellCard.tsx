import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SpellCardStatus = "enabled" | "disabled" | "broken" | "neutral";

interface SpellCardProps {
  status?: SpellCardStatus;
  className?: string;
  children: React.ReactNode;
  draggable?: boolean;
}

const STATUS_STYLES: Record<SpellCardStatus, string> = {
  enabled: "border-life-500/40 hover:border-life-400/60",
  disabled: "border-stone-600/60 grayscale-[0.4] opacity-80",
  broken: "border-blood-500/50",
  neutral: "border-stone-700 hover:border-gold-600/40",
};

export function SpellCard({ status = "neutral", className, children, draggable }: SpellCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-gradient-to-b from-stone-800/80 to-abyss-900/90 bg-noise p-5 shadow-md shadow-black/30 transition-colors",
        STATUS_STYLES[status],
        draggable && "cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {status === "enabled" && (
        <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_20px_rgba(79,206,124,0.12)]" />
      )}
      {status === "broken" && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_24px_rgba(225,75,66,0.18)] animate-crack-pulse" />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-30 animate-crack-pulse"
            preserveAspectRatio="none"
          >
            <line x1="10%" y1="0" x2="35%" y2="100%" stroke="#e14b42" strokeWidth="1" />
            <line x1="70%" y1="10%" x2="55%" y2="90%" stroke="#e14b42" strokeWidth="1" />
            <line x1="35%" y1="100%" x2="60%" y2="55%" stroke="#e14b42" strokeWidth="1" />
          </svg>
        </>
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
