import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <>
      <title>Page introuvable — Les Outils du Docteur</title>
      <meta name="robots" content="noindex" />
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Page introuvable</h1>
        <p className="text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <Link
          to="/"
          className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Voir tous les outils
        </Link>
      </div>
    </>
  );
}
