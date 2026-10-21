import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { CATALOG, type ToolMeta } from "@lod/core";
import { Link } from "react-router";
import { ICONS } from "../icons";

// Les outils en construction restent cliquables : leur page « Bientôt disponible »
// mesure l'intérêt qu'ils suscitent (une visite = une page vue dans l'analytics).
function ToolRow({ tool }: { tool: ToolMeta }) {
  const Icon = ICONS[tool.icon];
  const available = tool.status === "disponible";
  return (
    <li>
      <Link
        to={`/${tool.id}`}
        className="flex min-h-18 items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition active:scale-[0.98] active:bg-muted md:hover:border-primary/40 md:hover:shadow-md"
      >
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
            available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">{tool.name}</span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{tool.description}</span>
        </span>
        {available ? (
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            Bientôt
          </span>
        )}
      </Link>
    </li>
  );
}

export function HomePage() {
  return (
    <>
      <title>Les Outils du Docteur — calculateurs de santé</title>
      <meta
        name="description"
        content="IMC, tension, glycémie, grossesse… des calculateurs de santé simples, gratuits et utilisables hors ligne."
      />

      <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Les Outils du Docteur</h1>
      <p className="mt-1 text-sm text-muted-foreground md:text-base">
        Des calculateurs de santé simples, gratuits et utilisables sans connexion.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG.map((tool) => (
          <ToolRow key={tool.id} tool={tool} />
        ))}
      </ul>
    </>
  );
}
