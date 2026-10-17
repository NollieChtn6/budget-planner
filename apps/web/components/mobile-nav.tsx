"use client";

import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSidebarContent } from "@/components/app-sidebar-content";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever navigation happens, since the Sheet's own
  // open state would otherwise survive the client-side route change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is only read to trigger the effect on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Ouvrir le menu" />}>
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col gap-1 p-4">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <AppSidebarContent />
      </SheetContent>
    </Sheet>
  );
}
