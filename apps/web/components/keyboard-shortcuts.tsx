"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { NAV_ITEMS } from "@/components/app-nav";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** The pages that host the "new operation" dialogs (AddOperationDialogs). */
function hasOperationDialogs(pathname: string): boolean {
  return pathname === "/" || pathname === "/operations";
}

function focusAndScrollTo(id: string): void {
  const element = document.getElementById(id);
  element?.scrollIntoView({ block: "center" });
  element?.focus();
}

/** App-wide shortcuts from the charte (docs/ui/pecule_charte_V_01.html, "Ergonomie"). */
export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key >= "1" && event.key <= "5") {
        const item = NAV_ITEMS[Number(event.key) - 1];
        if (item) router.push(item.href);
        return;
      }

      if (event.key === "n" && hasOperationDialogs(pathname)) {
        window.dispatchEvent(new Event("pecule:open-add-expense"));
        return;
      }

      if (event.key === "v" && hasOperationDialogs(pathname)) {
        window.dispatchEvent(new Event("pecule:open-add-contribution"));
        return;
      }

      if (event.key === "o" && hasOperationDialogs(pathname)) {
        window.dispatchEvent(new Event("pecule:open-add-operation"));
        return;
      }

      if (event.key === "r" && hasOperationDialogs(pathname)) {
        window.dispatchEvent(new Event("pecule:open-add-reimbursement"));
        return;
      }

      if (event.key === "e" && hasOperationDialogs(pathname)) {
        window.dispatchEvent(new Event("pecule:open-add-extra-income"));
        return;
      }

      if (event.key === "t" && hasOperationDialogs(pathname)) {
        window.dispatchEvent(new Event("pecule:open-add-savings-transfer"));
        return;
      }

      if (event.key === "/" && pathname === "/operations") {
        event.preventDefault();
        focusAndScrollTo("operations-search");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, pathname]);

  return null;
}
