import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SUPPORTED_LANGUAGES, getLanguageOption } from "@/i18n/languages";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const { user, setLanguage } = useAuth();
  const { t } = useTranslation();
  const active = getLanguageOption(user.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("topbar.languageSwitcher.label")}
          className="flex items-center gap-2 rounded-md border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-xs text-parchment-200 transition-colors hover:border-gold-600/50 hover:text-gold-300"
        >
          <span className="text-base leading-none">{active.flag}</span>
          <span className="hidden max-w-[8rem] truncate sm:inline">{active.nativeName}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang.code} onSelect={() => setLanguage(lang.code)}>
            <span className="text-base leading-none">{lang.flag}</span>
            <span className="truncate">{lang.nativeName}</span>
            {lang.code === user.language ? <span className="ml-auto text-gold-400">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
