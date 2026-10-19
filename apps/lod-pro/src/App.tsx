import { CATALOG, ORGAN_LABELS, type ToolStatus } from "@lod/core";
import { ThemeToggle } from "./ThemeToggle";

const STATUS_LABELS: Record<ToolStatus, string> = {
  "en-construction": "En construction",
  disponible: "Disponible",
};

export function App() {
  const available = CATALOG.filter((t) => t.status === "disponible").length;

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <p className="text-lg font-semibold text-foreground">
            LOD-Pro <span className="font-normal text-muted-foreground">· Administration</span>
          </p>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Pilotage des outils</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {available} outil{available > 1 ? "s" : ""} disponible{available > 1 ? "s" : ""} sur {CATALOG.length}. Les
          statuts viennent du catalogue ; ils seront modifiables ici une fois Supabase branché.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Outil</th>
                <th className="px-4 py-3 font-medium">Organes</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {CATALOG.map((tool) => (
                <tr key={tool.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{tool.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tool.organs.map((o) => ORGAN_LABELS[o]).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        tool.status === "disponible" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[tool.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
