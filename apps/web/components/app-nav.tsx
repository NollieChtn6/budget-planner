"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Ce mois-ci" },
  { href: "/operations", label: "Opérations" },
  { href: "/months", label: "Historique" },
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
      {NAV_ITEMS.map((item) => {
        const current = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              current && "bg-muted font-semibold text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
