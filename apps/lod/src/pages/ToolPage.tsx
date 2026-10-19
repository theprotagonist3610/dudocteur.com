import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { getToolMeta } from "@lod/core";
import { Suspense } from "react";
import { useParams } from "react-router";
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
      <div className="flex items-center gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary md:h-14 md:w-14">
          <Icon className="h-6 w-6 md:h-7 md:w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-balance text-foreground md:text-3xl">{tool.name}</h1>
          <p className="text-sm text-muted-foreground md:text-base">{tool.description}</p>
        </div>
      </div>
      <div className="mt-6">
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
