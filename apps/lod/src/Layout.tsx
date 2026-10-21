import { Link, Outlet, ScrollRestoration } from "react-router";
import { InstallButton } from "./InstallButton";
import { ThemeToggle } from "./ThemeToggle";

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 md:px-6">
          <Link to="/" aria-label="Les Outils du Docteur — accueil" className="mr-auto">
            <img src="/logo.webp" alt="" width={303} height={80} className="h-8 w-auto" />
          </Link>
          <InstallButton />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-8 md:px-6 md:pt-10">
        <Outlet />
      </main>
      <footer className="border-t border-border pb-[env(safe-area-inset-bottom)]">
        <p className="mx-auto max-w-5xl px-4 py-5 text-center text-xs text-muted-foreground md:px-6">
          Outils à visée informative : ils ne remplacent pas un avis médical. Vos données restent sur votre appareil.
        </p>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
