import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [revealed, setRevealed] = React.useState(false);

    return (
      <div className="relative">
        <Input ref={ref} type={revealed ? "text" : "password"} className={cn("pr-9", className)} {...props} />
        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          aria-label={revealed ? "Hide password" : "Show password"}
          className="absolute right-0 top-0 flex h-10 w-9 items-center justify-center text-parchment-300/40 transition-colors hover:text-gold-300"
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
