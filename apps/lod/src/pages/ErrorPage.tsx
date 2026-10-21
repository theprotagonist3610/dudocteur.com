import { useEffect } from "react";
import { Link, useRouteError } from "react-router";

/*
  Échec de chargement d'un morceau de l'app (outil, courbes…), selon le navigateur.
  Cas typique en production : la page affichée date d'avant un déploiement et
  demande un fichier qui n'existe plus. Recharger récupère la nouvelle version.
*/
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically imported/i;
const RELOAD_KEY = "lod-chunk-reload";

function isChunkError(error: unknown) {
  return error instanceof Error && CHUNK_ERROR.test(error.message);
}

export function ErrorPage() {
  const error = useRouteError();
  const chunk = isChunkError(error);

  useEffect(() => {
    if (!chunk) return;
    // Pas plus d'un rechargement automatique toutes les 10 s : pas de boucle si le réseau est coupé.
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY));
      if (Date.now() - last < 10_000) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [chunk]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <title>Une erreur est survenue — Les Outils du Docteur</title>
      <h1 className="text-xl font-semibold text-foreground">
        {chunk ? "Impossible de charger cette page" : "Une erreur est survenue"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {chunk
          ? "Vérifiez votre connexion, puis rechargez la page. Vos données sont toujours sur votre téléphone."
          : "Rechargez la page. Vos données sont toujours sur votre téléphone."}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 h-12 w-full rounded-full bg-primary px-5 font-semibold text-primary-foreground active:bg-primary-hover"
      >
        Recharger
      </button>
      <Link to="/" reloadDocument className="h-11 content-center text-sm font-medium text-muted-foreground">
        Revenir à l'accueil
      </Link>
    </main>
  );
}
