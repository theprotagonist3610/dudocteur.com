import { ArrowLeftIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { getToolMeta } from "@lod/core";
import { Suspense } from "react";
import { Link, useParams } from "react-router";
import { ICONS } from "../icons";
import { TOOL_COMPONENTS } from "../tools";
import { NotFoundPage } from "./NotFoundPage";

function ComingSoon() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-10 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WrenchScrewdriverIcon className="h-7 w-7" />
      </span>
      <p className="font-semibold text-foreground">Outil en construction</p>
      <p className="max-w-xs text-sm text-muted-foreground">Cet outil sera bientôt disponible.</p>
    </div>
  );
}

export function ToolPage() {
  const { toolId = "" } = useParams();
  const tool = getToolMeta(toolId);
  if (!tool) return <NotFoundPage />;

  const Icon = ICONS[tool.icon];
  const Component = TOOL_COMPONENTS[tool.id];
  // En développement, un outil en construction s'ouvre dès que son interface existe.
  const usable = Component && (tool.status === "disponible" || import.meta.env.DEV);

  return (
    <>
      <title>{`${tool.name} — Les Outils du Docteur`}</title>
      <meta name="description" content={tool.description} />
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Tous les outils
      </Link>
      <div className="mt-6 flex items-center gap-4">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{tool.name}</h1>
          <p className="text-muted-foreground">{tool.description}</p>
        </div>
      </div>
      <div className="mt-8">
        {usable ? (
          <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
            <Component />
          </Suspense>
        ) : (
          <ComingSoon />
        )}
      </div>
    </>
  );
}
