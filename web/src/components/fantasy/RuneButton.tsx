import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const runeButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md border font-display font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-40 disabled:grayscale",
  {
    variants: {
      variant: {
        gold: "border-gold-500/50 bg-gradient-to-b from-stone-800 to-abyss-900 text-gold-300 hover:text-gold-200 hover:border-gold-400",
        arcane:
          "border-arcane-500/50 bg-gradient-to-b from-stone-800 to-abyss-900 text-arcane-400 hover:text-arcane-300 hover:border-arcane-400",
        mana: "border-mana-500/50 bg-gradient-to-b from-stone-800 to-abyss-900 text-mana-400 hover:text-mana-300 hover:border-mana-400",
        life: "border-life-500/50 bg-gradient-to-b from-stone-800 to-abyss-900 text-life-400 hover:text-life-300 hover:border-life-400",
        danger:
          "border-blood-500/50 bg-gradient-to-b from-stone-800 to-abyss-900 text-blood-400 hover:text-blood-300 hover:border-blood-400",
        ghost: "border-stone-700 bg-transparent text-parchment-300 hover:border-gold-600/50 hover:text-gold-300",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 text-sm",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "gold",
      size: "default",
    },
  }
);

const glowByVariant: Record<string, string> = {
  gold: "hover:shadow-rune-gold",
  arcane: "hover:shadow-[0_0_14px_2px_rgba(149,96,239,0.5)]",
  mana: "hover:shadow-rune-mana",
  life: "hover:shadow-rune-life",
  danger: "hover:shadow-rune-blood",
  ghost: "",
};

export interface RuneButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">, VariantProps<typeof runeButtonVariants> {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  glowOnHover?: boolean;
}

export const RuneButton = React.forwardRef<HTMLButtonElement, RuneButtonProps>(
  ({ className, variant = "gold", size, icon, children, glowOnHover = true, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: props.disabled ? 1 : 1.02 }}
        whileTap={{ scale: props.disabled ? 1 : 0.97 }}
        className={cn(
          runeButtonVariants({ variant, size }),
          glowOnHover && glowByVariant[variant ?? "gold"],
          className
        )}
        {...props}
      >
        <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />
        <span className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />
        {icon && <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
        {children && <span>{children}</span>}
      </motion.button>
    );
  }
);
RuneButton.displayName = "RuneButton";
