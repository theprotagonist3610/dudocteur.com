import type { poids } from "@lod/core";

// Appréciation de la masse grasse : toujours un libellé, la couleur ne fait que le renforcer.
export const FAT_LEVEL_TEXT: Record<poids.FatLevel, string> = {
  basse: "text-warning-text",
  ideale: "text-success",
  elevee: "text-destructive",
};
