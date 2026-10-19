import { Link, Outlet, ScrollRestoration } from "react-router";
import { ThemeToggle } from "./ThemeToggle";

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link to="/" aria-label="Les Outils du Docteur — accueil">
            <img src="/logo.png" alt="" className="h-10 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 md:px-6 md:py-16">
        <Outlet />
      </main>
      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground md:px-6">
          Outils à visée informative : ils ne remplacent pas un avis médical. Vos données restent sur votre appareil.
        </p>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
