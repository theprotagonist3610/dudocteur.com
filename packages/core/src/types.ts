/*
  Contrat commun à tous les outils, partagé par LOD, LOD-Pro et l'app mobile.
  Ce paquet ne dépend ni de React ni du DOM : il ne contient que des données
  et de la logique pure. Chaque app fournit ses propres interfaces et associe
  un composant d'icône à chaque nom d'icône (IconName).
*/

// --- Classification (organe, sexe, condition) -------------------------------

export type Organ =
  | "neuro"
  | "cardio"
  | "rein"
  | "metabolisme"
  | "gyneco"
  | "andro"
  | "respiratoire"
  | "pediatrie"
  | "toxicologie"
  | "infectio"
  | "douleur-bien-etre";

export type Sex = "tous" | "femme" | "homme";

export type Condition =
  | "diabete"
  | "hypertension"
  | "grossesse"
  | "insuffisance-renale"
  | "personne-agee"
  | "obesite"
  | "denutrition"
  | "enfant-premature";

export const ORGAN_LABELS: Record<Organ, string> = {
  neuro: "Cerveau & nerfs",
  cardio: "Cœur & vaisseaux",
  rein: "Reins",
  metabolisme: "Métabolisme & nutrition",
  gyneco: "Gynéco-obstétrique",
  andro: "Appareil génital masculin",
  respiratoire: "Respiratoire & sommeil",
  pediatrie: "Pédiatrie & croissance",
  toxicologie: "Toxicologie",
  infectio: "Infectiologie",
  "douleur-bien-etre": "Douleur & bien-être",
};

export const SEX_LABELS: Record<Sex, string> = {
  tous: "Tous",
  femme: "Femme",
  homme: "Homme",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  diabete: "Diabète",
  hypertension: "Hypertension",
  grossesse: "Grossesse",
  "insuffisance-renale": "Insuffisance rénale",
  "personne-agee": "Personne âgée",
  obesite: "Obésité",
  denutrition: "Dénutrition",
  "enfant-premature": "Enfant / prématuré",
};

// --- Fiche d'un outil ---------------------------------------------------------

// Nom d'icône indépendant de la plateforme : chaque app le traduit en composant.
export type IconName =
  | "scale"
  | "heart"
  | "beaker"
  | "calendar"
  | "brain"
  | "filter"
  | "fire"
  | "sparkles"
  | "user"
  | "baby"
  | "moon"
  | "warning"
  | "bug"
  | "smile"
  | "flag";

// "en-construction" : grisé pour les utilisateurs ; "disponible" : ouvrable.
export type ToolStatus = "en-construction" | "disponible";

export interface ToolMeta {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  organs: [Organ, ...Organ[]];
  sex: Sex;
  conditions: Condition[];
  status: ToolStatus;
}

export interface SummaryRow {
  label: string;
  value: string;
}

// --- Aides de validation et de mise en forme ----------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export const formatDecimal = (n: number) => n.toString().replace(".", ",");
