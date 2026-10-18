import Link from "next/link";
import { AppSidebarContent } from "@/components/app-sidebar-content";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { MobileNav } from "@/components/mobile-nav";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <div className="grid min-h-screen grid-cols-1 content-start md:grid-cols-[224px_minmax(0,1fr)]">
      <KeyboardShortcuts />
      <aside className="sticky top-0 z-40 hidden h-screen flex-col gap-1 overflow-y-hidden border-r bg-card p-4 md:flex">
        <AppSidebarContent />
      </aside>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-heading text-xl tracking-tight">
          {/* biome-ignore lint/performance/noImgElement: static brand mark, self-adapts to the theme via its own embedded media query */}
          <img src="/icon.svg" alt="" className="h-6 w-6" />
          Pécule
        </Link>
        <MobileNav />
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-10 md:py-9">
        {children}
      </main>
    </div>
  );
}
