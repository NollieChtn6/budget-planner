import { UserRound } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import packageJson from "@/package.json";

export function AppSidebarContent() {
  return (
    <>
      <Link
        href="/"
        prefetch={false}
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
          <div className="flex items-center">
            <Link
              href="/profile"
              prefetch={false}
              aria-label="Profil"
              title="Profil"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <UserRound />
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <p className="px-2 text-xs text-muted-foreground">v{packageJson.version}</p>
      </div>
    </>
  );
}
