import { CATALOG, type ToolMeta } from "@lod/core";
import { Link } from "react-router";
import { ICONS } from "../icons";

// Les outils en construction restent cliquables : leur page « Bientôt disponible »
// mesure l'intérêt qu'ils suscitent (une visite = une page vue dans l'analytics).
function ToolCard({ tool }: { tool: ToolMeta }) {
  const Icon = ICONS[tool.icon];
  const available = tool.status === "disponible";
  return (
    <Link
      to={`/${tool.id}`}
      className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {!available && (
        <span className="absolute top-3 right-3 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          Bientôt disponible
        </span>
      )}
      <span
        className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${
          available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-7 w-7" />
      </span>
      <span>
        <span className="block text-base font-semibold text-balance text-foreground">{tool.name}</span>
        <span className="mt-1 block text-sm text-pretty text-muted-foreground">{tool.description}</span>
      </span>
    </Link>
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
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">Les Outils du Docteur</h1>
        <p className="max-w-xl text-muted-foreground">
          Des calculateurs de santé simples, à visée informative — ils ne remplacent pas un avis médical.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {CATALOG.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </>
  );
}
