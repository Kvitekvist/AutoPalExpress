import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export function ScrollPanel({
  title,
  icon,
  actions,
  noPadding,
  className,
  children,
  ...props
}: ScrollPanelProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-stone-700 bg-gradient-to-b from-stone-800/70 to-abyss-900/80 bg-noise shadow-lg shadow-black/30",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 rounded-lg border border-gold-600/10" />
      <div className="pointer-events-none absolute left-0 top-0 h-4 w-4 rounded-tl-lg border-l-2 border-t-2 border-gold-600/40" />
      <div className="pointer-events-none absolute right-0 top-0 h-4 w-4 rounded-tr-lg border-r-2 border-t-2 border-gold-600/40" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 rounded-bl-lg border-b-2 border-l-2 border-gold-600/40" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 rounded-br-lg border-b-2 border-r-2 border-gold-600/40" />

      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-stone-700/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="shrink-0 text-gold-500 [&_svg]:h-[18px] [&_svg]:w-[18px]">{icon}</span>}
            {title && (
              <h3 className="truncate font-display text-base font-semibold text-gold-300">{title}</h3>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}
