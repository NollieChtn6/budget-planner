import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <div className="grid min-h-screen grid-cols-[224px_minmax(0,1fr)]">
      <aside className="sticky top-0 flex h-screen flex-col gap-1 border-r bg-card p-4">
        <Link
          href="/"
          className="mb-5 flex items-center gap-2 px-2 font-heading text-2xl tracking-tight"
        >
          {/* biome-ignore lint/performance/noImgElement: static brand mark, self-adapts to the theme via its own embedded media query */}
          <img src="/icon.svg" alt="" className="h-6 w-6" />
          Pécule
        </Link>
        <AppNav />
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-10 py-9">{children}</main>
    </div>
  );
}
