import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none",
      "border-stone-600 bg-stone-800 data-[state=checked]:border-gold-500/60 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-gold-600 data-[state=checked]:to-gold-500 data-[state=checked]:shadow-rune-gold",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-[18px] w-[18px] rounded-full bg-parchment-100 shadow-md ring-0 transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
