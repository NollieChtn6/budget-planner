"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/fixed-entries", label: "Postes fixes" },
  { href: "/settings/envelopes", label: "Enveloppes" },
  { href: "/settings/provisions", label: "Provisions" },
  { href: "/settings/categories", label: "Catégories" },
] as const;

export function SettingsSubnav() {
  const pathname = usePathname();

  return (
    <div
      className="flex gap-1 overflow-x-auto overflow-y-hidden border-b"
      role="tablist"
      aria-label="Paramètres"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm",
              active
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
