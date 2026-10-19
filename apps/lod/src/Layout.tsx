import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import { InstallButton } from "./InstallButton";
import { ThemeToggle } from "./ThemeToggle";

// Retour : revient à la page précédente de l'app (la liste retrouve sa recherche
// et son filtre, gardés dans l'URL) ; à défaut (lien ouvert directement), l'accueil.
function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => (location.key === "default" ? navigate("/") : navigate(-1));
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Retour"
      className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted"
    >
      <ArrowLeftIcon className="h-5 w-5" />
    </button>
  );
}

export function Layout() {
  const isHome = useLocation().pathname === "/";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 md:px-6">
          {!isHome && <BackButton />}
          <Link to="/" aria-label="Les Outils du Docteur — accueil" className="mr-auto">
            <img src="/logo.webp" alt="" width={303} height={80} className="h-8 w-auto" />
          </Link>
          {/* Sur l'accueil seulement : à côté du bouton retour, l'en-tête déborderait sur un écran de 360 px. */}
          {isHome && <InstallButton />}
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
