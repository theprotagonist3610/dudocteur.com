import type { imc } from "@lod/core";

// Couleurs de statut : toujours accompagnées d'un texte ou d'une icône, jamais seules.
export const TONE_TEXT: Record<imc.Tone, string> = {
  success: "text-success",
  warning: "text-warning-text",
  danger: "text-destructive",
};

export const TONE_BOX: Record<imc.Tone, string> = {
  success: "border-success/30 bg-success/10",
  warning: "border-warning/40 bg-warning/10",
  danger: "border-destructive/30 bg-destructive/10",
};

export const TONE_PILL: Record<imc.Tone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning-text",
  danger: "bg-destructive/15 text-destructive",
};

export const ASSESSMENT_TEXT: Record<imc.TrendAssessment, string> = {
  favorable: "text-success",
  defavorable: "text-destructive",
  neutre: "text-muted-foreground",
};

export const TONE_FILL: Record<imc.Tone, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
};
