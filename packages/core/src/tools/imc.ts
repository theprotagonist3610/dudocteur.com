// Logique de l'outil IMC. À visée informative uniquement : ne remplace pas un avis médical.
import { formatDecimal, isFiniteNumber, isRecord } from "../types";
import {
  daysBetween,
  formatDate,
  inRange,
  isIsoDate,
  newId,
  parseDecimal,
  sortByDate,
  todayIso,
  type InputErrors,
} from "../utils";

// Aides communes, exposées aussi par ce module pour les interfaces de l'outil.
export {
  daysBetween,
  formatDate,
  formatShortDate,
  parseDecimal,
  removeById,
  sortByDate,
  toIsoLocal,
  todayIso,
  tomorrowIso,
  type InputErrors,
} from "../utils";

export const IMC_TOOL_ID = "imc";

// Outil « Masse maigre et poids idéal », proposé depuis l'IMC.
export const LEAN_MASS_TOOL_ID = "poids";

// --- Types -------------------------------------------------------------------

// Une prise de mesures, telle que saisie.
export interface ImcEntry {
  id: string;
  date: string; // AAAA-MM-JJ
  weightKg: number;
  heightCm: number;
}

// Un objectif : un poids visé à une date donnée. Un seul objectif par jour.
export interface ImcGoal {
  id: string;
  date: string; // AAAA-MM-JJ, échéance
  weightKg: number;
}

// Données enregistrées par l'outil : l'historique des prises et les objectifs.
export interface ImcData {
  entries: ImcEntry[];
  goals: ImcGoal[];
}

export const EMPTY_IMC_DATA: ImcData = { entries: [], goals: [] };

export const BMI_CATEGORIES = [
  "Insuffisance pondérale",
  "Corpulence normale",
  "Surpoids",
  "Obésité modérée",
  "Obésité sévère",
  "Obésité morbide",
] as const;

export type BmiCategory = (typeof BMI_CATEGORIES)[number];

export type Trend = "hausse" | "baisse" | "stable" | "premiere";

// Effet d'une variation d'IMC sur la santé : se rapproche ou s'éloigne de la zone normale.
export type TrendAssessment = "favorable" | "defavorable" | "neutre";

// Ton d'affichage : normal, hors norme sans aggravation, hors norme qui s'aggrave.
export type Tone = "success" | "warning" | "danger";

// Une prise enrichie des valeurs calculées, prête à afficher.
export interface ImcRow extends ImcEntry {
  bmi: number;
  category: BmiCategory;
  trend: Trend;
  bmiDelta: number | null; // écart d'IMC avec la prise précédente
  assessment: TrendAssessment;
  comment: string;
  tone: Tone;
}

// --- Calculs -----------------------------------------------------------------

// IMC = poids (kg) / taille (m)², arrondi à une décimale.
export function computeBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

// Seuils OMS (kg/m²).
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Insuffisance pondérale";
  if (bmi < 25) return "Corpulence normale";
  if (bmi < 30) return "Surpoids";
  if (bmi < 35) return "Obésité modérée";
  if (bmi < 40) return "Obésité sévère";
  return "Obésité morbide";
}

export const NORMAL_BMI_RANGE = { min: 18.5, max: 25 } as const;

// Bandes de corpulence affichées sur la courbe d'IMC (seuils OMS).
export const BMI_BANDS = [
  { label: "Maigre", min: -Infinity, max: 18.5, tone: "warning" },
  { label: "Normal", min: 18.5, max: 25, tone: "success" },
  { label: "Surpoids", min: 25, max: 30, tone: "warning" },
  { label: "Obésité", min: 30, max: Infinity, tone: "danger" },
] as const;

// IMC de référence pour le poids idéal.
export const IDEAL_BMI = 22;

// Poids correspondant à un IMC de 22 pour une taille donnée, arrondi à 0,1 kg.
export function idealWeightKg(heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round(IDEAL_BMI * heightM * heightM * 10) / 10;
}

// Taille commune à toutes les prises (cas habituel chez l'adulte), ou null si elle a varié.
export function constantHeightCm(entries: Pick<ImcEntry, "heightCm">[]): number | null {
  const first = entries[0]?.heightCm;
  if (first === undefined) return null;
  return entries.every((e) => e.heightCm === first) ? first : null;
}

export const isNormalBmi = (bmi: number) => bmi >= NORMAL_BMI_RANGE.min && bmi < NORMAL_BMI_RANGE.max;

// Distance (en points d'IMC) entre un IMC et la zone normale ; 0 dans la zone.
export function distanceToNormal(bmi: number): number {
  if (bmi < NORMAL_BMI_RANGE.min) return NORMAL_BMI_RANGE.min - bmi;
  if (bmi >= NORMAL_BMI_RANGE.max) return bmi - NORMAL_BMI_RANGE.max;
  return 0;
}

// En dessous de cet écart d'IMC, la variation est considérée comme stable.
const TREND_THRESHOLD = 0.1;

export function trendOf(bmiDelta: number | null): Trend {
  if (bmiDelta === null) return "premiere";
  if (bmiDelta >= TREND_THRESHOLD) return "hausse";
  if (bmiDelta <= -TREND_THRESHOLD) return "baisse";
  return "stable";
}

/*
  Une variation est jugée sur son effet, pas sur son sens : une hausse qui fait
  sortir de la maigreur est favorable, une hausse qui fait passer de la zone
  normale au surpoids est défavorable. Rester dans la zone normale, ou ne pas
  bouger, est neutre.
*/
export function assessTrend(previousBmi: number | null, bmi: number, trend: Trend): TrendAssessment {
  if (previousBmi === null || trend === "stable" || trend === "premiere") return "neutre";
  const before = distanceToNormal(previousBmi);
  const after = distanceToNormal(bmi);
  if (after < before) return "favorable";
  if (after > before) return "defavorable";
  return "neutre";
}

const CATEGORY_SENTENCES: Record<BmiCategory, string> = {
  "Insuffisance pondérale": "Votre poids est inférieur à la normale.",
  "Corpulence normale": "Votre corpulence est normale.",
  Surpoids: "Vous êtes en surpoids.",
  "Obésité modérée": "Vous êtes en situation d'obésité modérée.",
  "Obésité sévère": "Vous êtes en situation d'obésité sévère.",
  "Obésité morbide": "Vous êtes en situation d'obésité massive.",
};

// Commentaire personnalisé : la situation actuelle, puis l'évolution depuis la prise précédente.
export function commentFor(
  row: Pick<ImcRow, "bmi" | "category" | "trend" | "assessment">,
  previousBmi: number | null,
): string {
  const normal = isNormalBmi(row.bmi);
  const situation = CATEGORY_SENTENCES[row.category];

  let evolution: string;
  if (row.trend === "premiere") {
    evolution = normal
      ? "Continuez à vous peser régulièrement pour suivre votre évolution."
      : "Pesez-vous régulièrement pour suivre votre évolution et parlez-en à votre médecin.";
  } else if (normal && previousBmi !== null && !isNormalBmi(previousBmi)) {
    evolution = "Bravo, votre IMC est revenu dans la zone normale !";
  } else if (row.trend === "stable") {
    evolution = normal ? "Votre poids est stable, continuez ainsi." : "Mais le bon côté, votre poids est resté stable.";
  } else if (row.assessment === "favorable") {
    evolution = "Bonne nouvelle : votre IMC se rapproche de la zone normale, continuez vos efforts.";
  } else if (row.assessment === "defavorable") {
    evolution = normal
      ? "Votre IMC reste normal, mais surveillez son évolution."
      : "Attention : votre IMC s'éloigne de la zone normale. Parlez-en à votre médecin.";
  } else {
    evolution = "Votre IMC reste dans la zone normale.";
  }
  return `${situation} ${evolution}`;
}

export function toneFor(bmi: number, assessment: TrendAssessment): Tone {
  if (isNormalBmi(bmi)) return "success";
  return assessment === "defavorable" ? "danger" : "warning";
}

// Trie les prises par date et calcule IMC, catégorie, tendance et commentaire (par rapport à la prise précédente).
export function buildRows(entries: ImcEntry[]): ImcRow[] {
  const sorted = sortByDate(entries);
  let previousBmi: number | null = null;
  return sorted.map((entry) => {
    const bmi = computeBmi(entry.weightKg, entry.heightCm);
    const bmiDelta = previousBmi === null ? null : Math.round((bmi - previousBmi) * 10) / 10;
    const trend = trendOf(bmiDelta);
    const category = bmiCategory(bmi);
    const assessment = assessTrend(previousBmi, bmi, trend);
    const comment = commentFor({ bmi, category, trend, assessment }, previousBmi);
    previousBmi = bmi;
    return { ...entry, bmi, category, trend, bmiDelta, assessment, comment, tone: toneFor(bmi, assessment) };
  });
}

// --- Prises ------------------------------------------------------------------

export const WEIGHT_RANGE = { min: 20, max: 300 } as const;
export const HEIGHT_RANGE = { min: 100, max: 250 } as const;

export function newEntry(date: string, weightKg: number, heightCm: number): ImcEntry {
  return { id: newId("pesee", date), date, weightKg, heightCm };
}

// Garde-fou « un jour = une mesure » : la prise déjà enregistrée à cette date, s'il y en a une.
export function findEntryOnDate(entries: ImcEntry[], date: string): ImcEntry | undefined {
  return entries.find((entry) => entry.date === date);
}

// Remplace la prise d'une date par une nouvelle (choix de l'utilisateur en cas de doublon).
export function replaceEntryOnDate(entries: ImcEntry[], entry: ImcEntry): ImcEntry[] {
  return [...entries.filter((e) => e.date !== entry.date), entry];
}

// --- Saisie ------------------------------------------------------------------

// Saisie brute d'un formulaire (les champs numériques restent du texte tant qu'ils ne sont pas validés).
export interface EntryInput {
  date: string;
  weightKg: string;
  heightCm: string;
}

// Vérifie une nouvelle prise ; renvoie les erreurs par champ, ou la prise prête à enregistrer.
export function validateEntryInput(
  input: EntryInput,
  today: string = todayIso(),
): { errors: InputErrors<EntryInput>; entry?: Omit<ImcEntry, "id"> } {
  const errors: InputErrors<EntryInput> = {};
  const weightKg = parseDecimal(input.weightKg);
  const heightCm = parseDecimal(input.heightCm);
  if (!isIsoDate(input.date) || input.date > today) errors.date = "Choisissez une date, pas dans le futur.";
  if (!inRange(weightKg, WEIGHT_RANGE)) errors.weightKg = `Entre ${WEIGHT_RANGE.min} et ${WEIGHT_RANGE.max} kg.`;
  if (!inRange(heightCm, HEIGHT_RANGE)) errors.heightCm = `Entre ${HEIGHT_RANGE.min} et ${HEIGHT_RANGE.max} cm.`;
  if (Object.keys(errors).length > 0) return { errors };
  return { errors, entry: { date: input.date, weightKg, heightCm } };
}

// --- Objectifs pondéraux ----------------------------------------------------

export function newGoal(date: string, weightKg: number): ImcGoal {
  return { id: newId("objectif", date), date, weightKg };
}

/*
  Rythme réaliste et durable de variation du poids, à la hausse comme à la baisse :
  0,5 à 1 kg par semaine est recommandé, 1 kg par semaine est le maximum.
  La même règle s'applique au Programme minceur. Proportionnelle au nombre de jours :
  ex. 7 jours → 1 kg ; 3 jours → 0,43 kg ; 10 jours → 1,43 kg ; 4 semaines → 4 kg.
*/
export const MAX_KG_PER_WEEK = 1;
export const RECOMMENDED_KG_PER_WEEK = { min: 0.5, max: 1 } as const;

export function maxWeightChangeKg(days: number): number {
  if (days <= 0) return 0;
  return (MAX_KG_PER_WEEK * days) / 7;
}

// Point de référence d'un objectif : une pesée ou un autre objectif.
export interface WeightAnchor {
  date: string;
  weightKg: number;
  kind: "pesee" | "objectif";
}

// Dernier point connu avant une date (pesée ou objectif), et premier objectif après.
export function goalNeighbors(date: string, entries: ImcEntry[], goals: ImcGoal[]) {
  const anchors: WeightAnchor[] = sortByDate([
    ...entries.map((e) => ({ date: e.date, weightKg: e.weightKg, kind: "pesee" as const })),
    ...goals.map((g) => ({ date: g.date, weightKg: g.weightKg, kind: "objectif" as const })),
  ]);
  const previous = anchors.filter((a) => a.date < date).at(-1);
  const next = sortByDate(goals).find((g) => g.date > date);
  return { previous, next };
}

// Fourchette de poids réaliste à une date, depuis le dernier point connu.
export function realisticRange(date: string, entries: ImcEntry[], goals: ImcGoal[]) {
  const { previous } = goalNeighbors(date, entries, goals);
  if (!previous) return null;
  const allowed = maxWeightChangeKg(daysBetween(previous.date, date));
  return {
    previous,
    min: Math.max(WEIGHT_RANGE.min, Math.round((previous.weightKg - allowed) * 10) / 10),
    max: Math.min(WEIGHT_RANGE.max, Math.round((previous.weightKg + allowed) * 10) / 10),
  };
}

const kindLabel = (anchor: WeightAnchor) => (anchor.kind === "pesee" ? "votre pesée" : "votre objectif");

/*
  Vérifie un nouvel objectif : date à venir, un seul objectif par jour, et
  rythme réaliste depuis le point précédent et jusqu'à l'objectif suivant.
  Renvoie un message d'erreur, ou null si l'objectif est acceptable.
*/
export function validateGoal(
  candidate: Pick<ImcGoal, "date" | "weightKg">,
  entries: ImcEntry[],
  goals: ImcGoal[],
  today: string = todayIso(),
): string | null {
  if (candidate.date <= today) return "L'échéance doit être dans le futur.";
  const sameDay = goals.find((g) => g.date === candidate.date);
  if (sameDay) {
    return `Un objectif existe déjà le ${formatDate(candidate.date)} (${formatDecimal(sameDay.weightKg)} kg). Un seul objectif par jour.`;
  }

  const { previous, next } = goalNeighbors(candidate.date, entries, goals);
  if (previous) {
    const days = daysBetween(previous.date, candidate.date);
    const allowed = maxWeightChangeKg(days);
    if (Math.abs(candidate.weightKg - previous.weightKg) > allowed + 1e-9) {
      return (
        `Objectif trop rapide : depuis ${kindLabel(previous)} du ${formatDate(previous.date)} ` +
        `(${formatDecimal(previous.weightKg)} kg), le poids peut varier d'au plus ${formatDecimal(Math.round(allowed * 10) / 10)} kg ` +
        `en ${days} jour${days > 1 ? "s" : ""} (au plus 1 kg par semaine).`
      );
    }
  }
  if (next) {
    const days = daysBetween(candidate.date, next.date);
    const allowed = maxWeightChangeKg(days);
    if (Math.abs(next.weightKg - candidate.weightKg) > allowed + 1e-9) {
      return (
        `Cet objectif rendrait irréaliste celui du ${formatDate(next.date)} (${formatDecimal(next.weightKg)} kg) : ` +
        `au plus ${formatDecimal(Math.round(allowed * 10) / 10)} kg d'écart en ${days} jour${days > 1 ? "s" : ""}.`
      );
    }
  }
  return null;
}

export interface GoalInput {
  date: string;
  weightKg: string;
}

// Vérifie la saisie d'un objectif (champs, puis rythme réaliste) ; renvoie les erreurs ou l'objectif.
export function validateGoalInput(
  input: GoalInput,
  entries: ImcEntry[],
  goals: ImcGoal[],
  today: string = todayIso(),
): { errors: InputErrors<GoalInput>; goal?: Omit<ImcGoal, "id"> } {
  const errors: InputErrors<GoalInput> = {};
  const weightKg = parseDecimal(input.weightKg);
  if (!isIsoDate(input.date) || input.date <= today) errors.date = "Choisissez une date à venir.";
  if (!inRange(weightKg, WEIGHT_RANGE)) errors.weightKg = `Entre ${WEIGHT_RANGE.min} et ${WEIGHT_RANGE.max} kg.`;
  if (Object.keys(errors).length > 0) return { errors };
  const problem = validateGoal({ date: input.date, weightKg }, entries, goals, today);
  if (problem) return { errors: { form: problem } };
  return { errors, goal: { date: input.date, weightKg } };
}

// En dessous de cet écart (kg), l'objectif est considéré comme atteint.
const GOAL_REACHED_KG = 0.1;

export interface GoalProgress {
  remainingKg: number; // toujours positif
  direction: "perdre" | "prendre" | "atteint";
  goalBmi: number;
  goalCategory: BmiCategory;
}

// Écart entre le dernier poids et l'objectif, et IMC qu'atteindrait l'objectif à la taille actuelle.
export function goalProgress(goal: Pick<ImcGoal, "weightKg">, lastWeightKg: number, heightCm: number): GoalProgress {
  const diff = Math.round((lastWeightKg - goal.weightKg) * 10) / 10;
  const goalBmi = computeBmi(goal.weightKg, heightCm);
  const direction = Math.abs(diff) < GOAL_REACHED_KG ? "atteint" : diff > 0 ? "perdre" : "prendre";
  return { remainingKg: Math.abs(diff), direction, goalBmi, goalCategory: bmiCategory(goalBmi) };
}

// --- Mise en forme -----------------------------------------------------------

/*
  Graduations rondes pour un axe : choisit un pas parmi 0,1 / 0,2 / 0,5 / 1 / 2 / 5 / 10…
  donnant au plus maxTicks graduations, et cale le domaine sur ce pas.
*/
export function niceTicks(min: number, max: number, maxTicks = 5): { domain: [number, number]; ticks: number[] } {
  const span = Math.max(max - min, 1e-9);
  const magnitude = 10 ** Math.floor(Math.log10(span / maxTicks));
  const step =
    [1, 2, 5, 10].map((m) => m * magnitude).find((s) => Math.ceil(max / s) - Math.floor(min / s) + 1 <= maxTicks) ??
    10 * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { domain: [ticks[0] ?? lo, ticks[ticks.length - 1] ?? hi], ticks };
}

export const formatSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${formatDecimal(Math.abs(n))}`;

// --- Validation des données relues du stockage -------------------------------

function isImcEntry(v: unknown): v is ImcEntry {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    isIsoDate(v.date) &&
    isFiniteNumber(v.weightKg) &&
    isFiniteNumber(v.heightCm)
  );
}

function isImcGoal(v: unknown): v is ImcGoal {
  return isRecord(v) && typeof v.id === "string" && isIsoDate(v.date) && isFiniteNumber(v.weightKg);
}

// Une donnée relue du téléphone peut être abîmée ou venir d'une ancienne version : on la vérifie.
export function isImcData(v: unknown): v is ImcData {
  return (
    isRecord(v) &&
    Array.isArray(v.entries) &&
    v.entries.every(isImcEntry) &&
    Array.isArray(v.goals) &&
    v.goals.every(isImcGoal)
  );
}
