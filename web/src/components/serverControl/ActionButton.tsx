import { useTranslation } from "react-i18next";
import { RuneButton } from "@/components/fantasy/RuneButton";
import type * as React from "react";

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  variant: "gold" | "arcane" | "mana" | "life" | "danger";
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

export function ActionButton({ icon, label, variant, disabled, loading, onClick }: ActionButtonProps) {
  const { t } = useTranslation();
  return (
    <RuneButton
      variant={variant}
      size="lg"
      onClick={onClick}
      disabled={disabled || loading}
      className="h-24 w-full flex-col gap-2 text-sm"
    >
      <span className="[&_svg]:h-7 [&_svg]:w-7">{icon}</span>
      {loading ? t("serverControl.working", { defaultValue: "Working..." }) : label}
    </RuneButton>
  );
}
