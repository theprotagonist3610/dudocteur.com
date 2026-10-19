// Recherche dans le catalogue : texte libre (insensible à la casse et aux accents) et organe.
import { CONDITION_LABELS, ORGAN_LABELS, type Organ, type ToolMeta } from "./types";

// "Glycémie" → "glycemie" : on compare sans accents ni majuscules.
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

// Texte dans lequel on cherche : nom, description, organes et conditions
// (chercher « diabète » trouve tous les outils utiles aux diabétiques).
function haystack(tool: ToolMeta): string {
  return normalize(
    [
      tool.name,
      tool.description,
      ...tool.organs.map((o) => ORGAN_LABELS[o]),
      ...tool.conditions.map((c) => CONDITION_LABELS[c]),
    ].join(" "),
  );
}

// Chaque mot de la recherche doit apparaître (ordre libre).
export function searchTools(tools: readonly ToolMeta[], query: string, organ: Organ | null = null): ToolMeta[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return tools.filter((tool) => {
    if (organ && !tool.organs.includes(organ)) return false;
    if (words.length === 0) return true;
    const text = haystack(tool);
    return words.every((word) => text.includes(word));
  });
}

// Organes ayant au moins un outil, dans l'ordre de ORGAN_LABELS (pour les filtres).
export function organsInUse(tools: readonly ToolMeta[]): Organ[] {
  const used = new Set(tools.flatMap((t) => t.organs));
  return (Object.keys(ORGAN_LABELS) as Organ[]).filter((o) => used.has(o));
}

export function isOrgan(value: unknown): value is Organ {
  return typeof value === "string" && value in ORGAN_LABELS;
}
