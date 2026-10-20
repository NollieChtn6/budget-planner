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
    <nav aria-label="Sections des paramètres" className="flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-1.5 text-[13px] max-md:flex-1 md:px-3 md:text-sm",
              active
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
