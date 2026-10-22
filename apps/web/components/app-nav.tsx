"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Ce mois-ci" },
  { href: "/history", label: "Historique" },
  { href: "/stats", label: "Statistiques" },
  { href: "/operations", label: "Opérations" },
  { href: "/provisions", label: "Provisions" },
  { href: "/settings/fixed-entries", label: "Paramètres" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/settings/fixed-entries") return pathname.startsWith("/settings");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navigation principale">
      {NAV_ITEMS.map((item, index) => {
        const current = isActive(pathname, item.href);
        return (
          <Fragment key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                current && "bg-muted font-semibold text-foreground",
              )}
            >
              {item.label}
              <Kbd>{index + 1}</Kbd>
            </Link>
            {/* Separates "suivi" (ce mois-ci, historique) from the rest of the nav. */}
            {item.href === "/stats" ? <Separator className="my-1" /> : null}
          </Fragment>
        );
      })}
    </nav>
  );
}
