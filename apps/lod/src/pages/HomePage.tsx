import { ChevronRightIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CATALOG, isOrgan, ORGAN_LABELS, organsInUse, searchTools, type Organ, type ToolMeta } from "@lod/core";
import { Link, useSearchParams } from "react-router";
import { ICONS } from "../icons";

const ORGANS = organsInUse(CATALOG);

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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground active:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

export function HomePage() {
  // Recherche et filtre gardés dans l'URL : le bouton retour d'un outil les retrouve.
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const organParam = params.get("organe");
  const organ: Organ | null = isOrgan(organParam) ? organParam : null;
  const tools = searchTools(CATALOG, query, organ);

  const update = (next: { q?: string; organe?: Organ | null }) => {
    const q = next.q ?? query;
    const o = next.organe === undefined ? organ : next.organe;
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (o) search.set("organe", o);
    setParams(search, { replace: true, preventScrollReset: true });
  };

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

      {/* Recherche et filtres restent à portée de main pendant le défilement. */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 mt-4 bg-background/95 px-4 pt-2 pb-3 backdrop-blur md:-mx-6 md:px-6">
        <label className="relative block">
          <span className="sr-only">Rechercher un outil</span>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          {/* text-base (16 px) : en dessous, Safari zoome sur le champ au toucher. */}
          <input
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Poids, tension, grossesse…"
            className="h-12 w-full rounded-full border border-border bg-surface pr-12 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => update({ q: "" })}
              className="absolute top-1/2 right-1 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </label>
        <div
          role="group"
          aria-label="Filtrer par organe"
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 scrollbar-none md:-mx-6 md:flex-wrap md:px-6 [&::-webkit-scrollbar]:hidden"
        >
          <Chip label="Tous" active={organ === null} onClick={() => update({ organe: null })} />
          {ORGANS.map((o) => (
            <Chip key={o} label={ORGAN_LABELS[o]} active={organ === o} onClick={() => update({ organe: o })} />
          ))}
        </div>
      </div>

      <p className="mt-2 mb-3 text-sm text-muted-foreground" aria-live="polite">
        {tools.length} outil{tools.length > 1 ? "s" : ""}
      </p>

      {tools.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolRow key={tool.id} tool={tool} />
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <p className="font-semibold text-foreground">Aucun outil trouvé</p>
          <p className="mt-1 text-sm text-muted-foreground">Essayez un autre mot ou un autre filtre.</p>
          <button
            type="button"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
            className="mt-4 h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground active:bg-primary-hover"
          >
            Voir tous les outils
          </button>
        </div>
      )}
    </>
  );
}
