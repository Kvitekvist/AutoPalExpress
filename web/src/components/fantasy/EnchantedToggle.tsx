import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EnchantedToggleProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function EnchantedToggle({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: EnchantedToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-md border border-stone-700 bg-abyss-900/40 px-4 py-3 transition-colors",
        checked && "border-gold-600/30",
        className
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="normal-case text-sm font-medium text-parchment-100 tracking-normal">
          {label}
        </Label>
        {description && <p className="mt-0.5 text-xs text-parchment-300/60">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
