import { cn } from "cn";
import type * as React from "react";

/** A keyboard-shortcut badge, shown on desktop only (docs/ui/pecule_charte_V_01.html, kbd). */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "hidden h-[17px] min-w-[17px] items-center justify-center rounded-sm border border-b-2 border-border bg-card px-1 font-mono font-medium text-[11px] text-muted-foreground md:inline-flex",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
