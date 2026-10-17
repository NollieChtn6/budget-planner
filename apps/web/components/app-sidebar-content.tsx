import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import packageJson from "@/package.json";

export function AppSidebarContent() {
  return (
    <>
      <Link
        href="/"
        className="mb-5 flex items-center gap-2 px-2 font-heading text-2xl tracking-tight"
      >
        {/* biome-ignore lint/performance/noImgElement: static brand mark, self-adapts to the theme via its own embedded media query */}
        <img src="/icon.svg" alt="" className="h-6 w-6" />
        Pécule
      </Link>
      <AppNav />
      <div className="mt-auto flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <SignOutButton />
          <ThemeToggle />
        </div>
        <p className="px-2 text-xs text-muted-foreground">v{packageJson.version}</p>
      </div>
    </>
  );
}
