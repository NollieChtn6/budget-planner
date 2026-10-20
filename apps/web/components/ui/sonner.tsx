"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Colours come from the app's own tokens, so the toast follows the light/dark toggle
 * (a class on <html>) without a theme provider.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      mobileOffset={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
