// Logique de l'outil « Masse maigre et poids idéal ».
// À visée informative uniquement : ne remplace pas un avis médical.
import { formatDecimal, isFiniteNumber, isOneOf, isRecord } from "../types";
import {
  inRange,
  isIsoDate,
  newId,
  parseDecimal,
  sortByDate,
  todayIso,
  type InputErrors,
} from "../utils";
import { computeBmi, HEIGHT_RANGE, WEIGHT_RANGE, type ImcEntry } from "./imc";

export const POIDS_TOOL_ID = "poids";

// Outil « Besoins énergétiques », proposé depuis celui-ci.
export const ENERGY_NEEDS_TOOL_ID = "besoins-energetiques";

export { HEIGHT_RANGE, WEIGHT_RANGE };

// Aides communes, exposées aussi par ce module pour les interfaces de l'outil.
export {
  formatDate,
  formatInteger,
  formatShortDate,
  removeById,
  todayIso,
  toIsoLocal,
  toTime,
  type InputErrors,
} from "../utils";

// --- Types -------------------------------------------------------------------

export const SEXES = ["homme", "femme"] as const;
export type BiologicalSex = (typeof SEXES)[number];

// Estimatif : à partir des pesées de l'IMC (poids + taille). Manuel : à partir des mensurations.
export const MODES = ["estimatif", "manuel"] as const;
export type Mode = (typeof MODES)[number];

export type LeanMassLevel = "basse" | "normale";

// james / boer : mode estimatif ; navy : mode manuel (mensurations).
export type LeanMassFormula = "james" | "boer" | "navy";

export type FatLevel = "basse" | "ideale" | "elevee";

// Une prise enrichie des estimations de composition corporelle.
export interface LeanMassRow {
  id: string;
  date: string; // AAAA-MM-JJ
  weightKg: number;
  heightCm: number;
  bmi: number;
  formula: LeanMassFormula; // formule retenue (selon l'IMC en mode estimatif)
  leanMassKg: number;
  fatMassKg: number; // masse grasse = poids − masse maigre
  fatPercent: number; // part de masse grasse dans le poids (%)
  fatLevel: FatLevel;
  bmrKcal: number; // métabolisme de base de l'utilisateur (Katch-McArdle)
  referenceBmrKcal: number; // métabolisme de base « normal » au même poids
  ffmi: number; // indice de masse maigre, à partir de la masse maigre retenue
  level: LeanMassLevel;
}

/*
  Mensurations d'un jour (cm). Le tour de hanches n'est requis que pour une femme.
  Le poids et la taille n'y figurent pas : ce sont ceux de la pesée IMC du même
  jour, seule source du poids et de la taille pour que les deux outils concordent.
*/
export interface MeasurementEntry {
  id: string;
  date: string;
  neckCm: number;
  waistCm: number;
  hipCm: number | null;
}

// Données enregistrées par l'outil. Les pesées du mode estimatif sont celles de l'IMC.
export interface PoidsData {
  sex: BiologicalSex | null; // null tant que l'utilisateur ne l'a pas indiqué
  mode: Mode;
  measurements: MeasurementEntry[];
}

export const EMPTY_POIDS_DATA: PoidsData = { sex: null, mode: "estimatif", measurements: [] };

// --- Calculs (mode estimatif) ------------------------------------------------

const round1 = (n: number) => Math.round(n * 10) / 10;

/*
  Formule de James (1976), poids en kg, taille en cm.
    Homme : 1,1 × P − 128 × (P / T)²
    Femme : 1,07 × P − 148 × (P / T)²
  Elle sous-estime nettement la masse maigre en cas d'obésité (IMC > 35 environ).
*/
export function jamesLeanMassKg(weightKg: number, heightCm: number, sex: BiologicalSex): number {
  const ratio = (weightKg / heightCm) ** 2;
  return round1(sex === "homme" ? 1.1 * weightKg - 128 * ratio : 1.07 * weightKg - 148 * ratio);
}

/*
  Formule de Boer (1984), poids en kg, taille en cm.
    Homme : 0,407 × P + 0,267 × T − 19,2
    Femme : 0,252 × P + 0,473 × T − 48,3
*/
export function boerLeanMassKg(weightKg: number, heightCm: number, sex: BiologicalSex): number {
  return round1(
    sex === "homme" ? 0.407 * weightKg + 0.267 * heightCm - 19.2 : 0.252 * weightKg + 0.473 * heightCm - 48.3,
  );
}

/*
  Choix de la formule selon l'IMC : James convient tant que l'IMC reste sous 30 ;
  en cas d'obésité, elle sous-estime la masse maigre (et devient absurde aux IMC
  élevés), on retient alors Boer.
*/
export const JAMES_MAX_BMI = 30;

export const formulaForBmi = (bmi: number): LeanMassFormula => (bmi < JAMES_MAX_BMI ? "james" : "boer");

export const FORMULA_LABELS: Record<LeanMassFormula, string> = {
  james: "James (1976)",
  boer: "Boer (1984)",
  navy: "l'US Navy (mensurations)",
};

// Nom court affiché dans l'historique.
export const FORMULA_SHORT_LABELS: Record<LeanMassFormula, string> = {
  james: "James",
  boer: "Boer",
  navy: "Mensurations",
};

export function estimateLeanMassKg(weightKg: number, heightCm: number, sex: BiologicalSex) {
  const bmi = computeBmi(weightKg, heightCm);
  const formula = formulaForBmi(bmi);
  const leanMassKg =
    formula === "james" ? jamesLeanMassKg(weightKg, heightCm, sex) : boerLeanMassKg(weightKg, heightCm, sex);
  return { bmi, formula, leanMassKg };
}

// Masse grasse = poids − masse maigre, en kg et en pourcentage du poids (arrondis à 0,1).
export function fatMass(weightKg: number, leanMassKg: number) {
  const fatMassKg = round1(weightKg - leanMassKg);
  return { fatMassKg, fatPercent: round1((fatMassKg / weightKg) * 100) };
}

// --- Appréciation de la masse grasse ---

// Pourcentage de masse grasse idéal selon le sexe.
export const IDEAL_FAT_PERCENT: Record<BiologicalSex, { min: number; max: number }> = {
  homme: { min: 12, max: 15 },
  femme: { min: 20, max: 24 },
};

export function fatLevel(fatPercent: number, sex: BiologicalSex): FatLevel {
  const { min, max } = IDEAL_FAT_PERCENT[sex];
  if (fatPercent < min) return "basse";
  if (fatPercent > max) return "elevee";
  return "ideale";
}

export const FAT_LEVEL_LABELS: Record<FatLevel, string> = {
  basse: "Basse",
  ideale: "Idéale",
  elevee: "Élevée",
};

// --- Métabolisme de base (Katch-McArdle) ---

// Métabolisme de base (kcal/jour) = 370 + 21,6 × masse maigre (kg), arrondi à l'unité.
export function katchMcArdleKcal(leanMassKg: number): number {
  return Math.round(370 + 21.6 * leanMassKg);
}

/*
  Métabolisme de base « normal » : celui d'une personne du même poids dont la
  masse grasse serait idéale (milieu de la fourchette : 13,5 % pour un homme,
  22 % pour une femme). L'écart avec la courbe de l'utilisateur montre l'effet
  de la composition corporelle.
*/
export function referenceBmrKcal(weightKg: number, sex: BiologicalSex): number {
  const { min, max } = IDEAL_FAT_PERCENT[sex];
  const idealFat = (min + max) / 2;
  return katchMcArdleKcal(weightKg * (1 - idealFat / 100));
}

// --- Code couleur des indicateurs (KPI) ---

export type KpiTone = "success" | "warning" | "danger";

export interface KpiStatus {
  tone: KpiTone;
  label: string;
}

/*
  Écart du métabolisme de base de l'utilisateur à la normale : jusqu'à 5 % en
  dessous, c'est proche ; de 5 à 10 %, un peu bas ; au-delà de 10 %, bas.
  Un métabolisme supérieur à la normale est favorable.
*/
export const BMR_GAP_THRESHOLDS = { warning: 5, danger: 10 } as const;

export function bmrStatus(bmrKcal: number, referenceKcal: number): KpiStatus {
  const deficitPercent = ((referenceKcal - bmrKcal) / referenceKcal) * 100;
  if (deficitPercent > BMR_GAP_THRESHOLDS.danger) return { tone: "danger", label: "Bas" };
  if (deficitPercent > BMR_GAP_THRESHOLDS.warning) return { tone: "warning", label: "Un peu bas" };
  return { tone: "success", label: deficitPercent > 0 ? "Proche de la normale" : "Normal" };
}

const FAT_LEVEL_TONES: Record<FatLevel, KpiTone> = { basse: "warning", ideale: "success", elevee: "danger" };

// Statut des 4 indicateurs de la dernière prise.
export function kpiStatuses(row: Pick<LeanMassRow, "level" | "fatLevel" | "bmrKcal" | "referenceBmrKcal">) {
  const lowLeanMass = row.level === "basse";
  return {
    leanMass: lowLeanMass
      ? ({ tone: "danger", label: "Basse" } as const)
      : ({ tone: "success", label: "Suffisante" } as const),
    fat: { tone: FAT_LEVEL_TONES[row.fatLevel], label: FAT_LEVEL_LABELS[row.fatLevel] },
    ffmi: lowLeanMass ? ({ tone: "danger", label: "Bas" } as const) : ({ tone: "success", label: "Normal" } as const),
    bmr: bmrStatus(row.bmrKcal, row.referenceBmrKcal),
  } satisfies Record<string, KpiStatus>;
}

// Indice de masse maigre (IMM, ou FFMI) = masse maigre (kg) / taille (m)².
export function fatFreeMassIndex(leanMassKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return round1(leanMassKg / (heightM * heightM));
}

// Seuils ESPEN (2015) de masse maigre basse, critère de dénutrition (kg/m²).
export const LOW_FFMI: Record<BiologicalSex, number> = { homme: 17, femme: 15 };

export function leanMassLevel(ffmi: number, sex: BiologicalSex): LeanMassLevel {
  return ffmi < LOW_FFMI[sex] ? "basse" : "normale";
}

// Complète une prise à partir de sa masse maigre (commun aux modes estimatif et manuel).
function toRow(
  entry: Pick<ImcEntry, "id" | "date" | "weightKg" | "heightCm">,
  leanMassKg: number,
  formula: LeanMassFormula,
  sex: BiologicalSex,
): LeanMassRow {
  const ffmi = fatFreeMassIndex(leanMassKg, entry.heightCm);
  const { fatMassKg, fatPercent } = fatMass(entry.weightKg, leanMassKg);
  return {
    id: entry.id,
    date: entry.date,
    weightKg: entry.weightKg,
    heightCm: entry.heightCm,
    bmi: computeBmi(entry.weightKg, entry.heightCm),
    formula,
    leanMassKg,
    fatMassKg,
    fatPercent,
    fatLevel: fatLevel(fatPercent, sex),
    bmrKcal: katchMcArdleKcal(leanMassKg),
    referenceBmrKcal: referenceBmrKcal(entry.weightKg, sex),
    ffmi,
    level: leanMassLevel(ffmi, sex),
  };
}

// Mode estimatif : masse maigre par James ou Boer selon l'IMC, pour chaque pesée.
export function buildLeanMassRows(entries: ImcEntry[], sex: BiologicalSex): LeanMassRow[] {
  return sortByDate(entries).map((entry) => {
    const { formula, leanMassKg } = estimateLeanMassKg(entry.weightKg, entry.heightCm, sex);
    return toRow(entry, leanMassKg, formula, sex);
  });
}

// --- Calculs (mode manuel : mensurations) ------------------------------------

/*
  Méthode de l'US Navy (Hodgdon et Beckett), mesures en cm, log décimal :
    Homme : % MG = 495 / (1,0324 − 0,19077 × log(taille abdo − cou) + 0,15456 × log(taille)) − 450
    Femme : % MG = 495 / (1,29579 − 0,35004 × log(taille abdo + hanches − cou) + 0,22100 × log(taille)) − 450
  Renvoie null si les mesures ne permettent pas le calcul (hanches manquantes, tour de taille ≤ cou…).
*/
export function navyFatPercent(
  m: Pick<MeasurementEntry, "neckCm" | "waistCm" | "hipCm"> & { heightCm: number },
  sex: BiologicalSex,
): number | null {
  let density: number;
  if (sex === "homme") {
    const girth = m.waistCm - m.neckCm;
    if (girth <= 0) return null;
    density = 1.0324 - 0.19077 * Math.log10(girth) + 0.15456 * Math.log10(m.heightCm);
  } else {
    if (m.hipCm === null) return null;
    const girth = m.waistCm + m.hipCm - m.neckCm;
    if (girth <= 0) return null;
    density = 1.29579 - 0.35004 * Math.log10(girth) + 0.221 * Math.log10(m.heightCm);
  }
  const percent = 495 / density - 450;
  // En dehors de cette plage, le résultat n'a pas de sens physiologique : mesures à vérifier.
  return percent > 2 && percent < 70 ? round1(percent) : null;
}

// Pourquoi des mensurations ne peuvent pas être calculées.
export type UnusableReason = "pesee-manquante" | "incoherentes";

export interface UnusableMeasurement {
  measurement: MeasurementEntry;
  reason: UnusableReason;
}

/*
  Mode manuel : chaque prise de mensurations est associée à la pesée IMC du même
  jour (poids et taille), puis la masse maigre est déduite du pourcentage de masse
  grasse US Navy. Sans pesée ce jour-là (supprimée dans l'IMC), ou si les mesures
  sont incohérentes (hanches manquantes pour une femme…), la prise est mise de côté.
*/
export function buildMeasurementRows(measurements: MeasurementEntry[], entries: ImcEntry[], sex: BiologicalSex) {
  const entryByDate = new Map(entries.map((e) => [e.date, e]));
  const rows: LeanMassRow[] = [];
  const unusable: UnusableMeasurement[] = [];
  for (const m of sortByDate(measurements)) {
    const entry = entryByDate.get(m.date);
    if (!entry) {
      unusable.push({ measurement: m, reason: "pesee-manquante" });
      continue;
    }
    const percent = navyFatPercent({ ...m, heightCm: entry.heightCm }, sex);
    if (percent === null) {
      unusable.push({ measurement: m, reason: "incoherentes" });
      continue;
    }
    const day = { id: m.id, date: m.date, weightKg: entry.weightKg, heightCm: entry.heightCm };
    rows.push(toRow(day, round1(entry.weightKg * (1 - percent / 100)), "navy", sex));
  }
  return { rows, unusable };
}

/*
  Composition corporelle actuelle, telle que l'outil l'affiche : dernière prise du
  mode choisi. En mode mensurations sans prise calculable, on se rabat sur
  l'estimation depuis la dernière pesée. Utilisée par l'outil Besoins énergétiques
  pour que le métabolisme de base soit le même dans les deux outils.
*/
export function latestComposition(data: PoidsData, entries: ImcEntry[]): LeanMassRow | null {
  if (!data.sex) return null;
  if (data.mode === "manuel") {
    const latest = buildMeasurementRows(data.measurements, entries, data.sex).rows.at(-1);
    if (latest) return latest;
  }
  return buildLeanMassRows(entries, data.sex).at(-1) ?? null;
}

// Effet d'une saisie de mensurations sur la pesée IMC du même jour.
export type DayEntryEffect = "ajoutee" | "identique" | "remplacee";

export function dayEntryEffect(entries: ImcEntry[], date: string, weightKg: number, heightCm: number) {
  const existing = entries.find((e) => e.date === date);
  const effect: DayEntryEffect = !existing
    ? "ajoutee"
    : existing.weightKg === weightKg && existing.heightCm === heightCm
      ? "identique"
      : "remplacee";
  return { effect, existing };
}

// Plages de saisie des mensurations (cm).
export const NECK_RANGE = { min: 20, max: 70 } as const;
export const WAIST_RANGE = { min: 40, max: 200 } as const;
export const HIP_RANGE = { min: 50, max: 200 } as const;

export function newMeasurement(values: Omit<MeasurementEntry, "id">): MeasurementEntry {
  return { id: newId("mesure", values.date), ...values };
}

// Un jour = une mesure : une nouvelle saisie remplace celle du même jour.
export function replaceMeasurementOnDate(measurements: MeasurementEntry[], m: MeasurementEntry): MeasurementEntry[] {
  return [...measurements.filter((c) => c.date !== m.date), m];
}

// Saisie brute des mensurations (texte tant que non validé).
export interface MeasurementInput {
  date: string;
  weightKg: string;
  heightCm: string;
  neckCm: string;
  waistCm: string;
  hipCm: string;
}

const rangeMessage = (range: { min: number; max: number }, unit: string) => `Entre ${range.min} et ${range.max} ${unit}.`;

/*
  Vérifie la saisie ; le tour de hanches n'est demandé (et gardé) que pour une femme.
  Renvoie séparément les mensurations (pour cet outil) et la pesée du jour (pour l'IMC).
*/
export function validateMeasurementInput(
  input: MeasurementInput,
  sex: BiologicalSex,
  today: string = todayIso(),
): {
  errors: InputErrors<MeasurementInput>;
  measurement?: Omit<MeasurementEntry, "id">;
  entry?: Omit<ImcEntry, "id">;
} {
  const errors: InputErrors<MeasurementInput> = {};
  const values = {
    weightKg: parseDecimal(input.weightKg),
    heightCm: parseDecimal(input.heightCm),
    neckCm: parseDecimal(input.neckCm),
    waistCm: parseDecimal(input.waistCm),
    hipCm: sex === "femme" ? parseDecimal(input.hipCm) : null,
  };
  if (!isIsoDate(input.date) || input.date > today) errors.date = "Choisissez une date, pas dans le futur.";
  if (!inRange(values.weightKg, WEIGHT_RANGE)) errors.weightKg = rangeMessage(WEIGHT_RANGE, "kg");
  if (!inRange(values.heightCm, HEIGHT_RANGE)) errors.heightCm = rangeMessage(HEIGHT_RANGE, "cm");
  if (!inRange(values.neckCm, NECK_RANGE)) errors.neckCm = rangeMessage(NECK_RANGE, "cm");
  if (!inRange(values.waistCm, WAIST_RANGE)) errors.waistCm = rangeMessage(WAIST_RANGE, "cm");
  if (values.hipCm !== null && !inRange(values.hipCm, HIP_RANGE)) errors.hipCm = rangeMessage(HIP_RANGE, "cm");
  if (Object.keys(errors).length > 0) return { errors };

  const { weightKg, heightCm, ...girths } = values;
  // Mesures dans les plages mais incohérentes entre elles (ex. tour de taille ≤ tour de cou).
  if (navyFatPercent({ ...girths, heightCm }, sex) === null) {
    return { errors: { form: "Ces mesures ne permettent pas le calcul : vérifiez le tour de cou et le tour de taille." } };
  }
  return { errors, measurement: { date: input.date, ...girths }, entry: { date: input.date, weightKg, heightCm } };
}

// Commentaire de la dernière prise.
export function leanMassComment(row: LeanMassRow, sex: BiologicalSex): string {
  return row.level === "basse"
    ? `Votre indice de masse maigre (${formatDecimal(row.ffmi)}) est bas : en dessous de ${LOW_FFMI[sex]}, il peut signaler une perte musculaire ou une dénutrition. Parlez-en à votre médecin.`
    : `Votre indice de masse maigre (${formatDecimal(row.ffmi)}) est dans les valeurs habituelles (${LOW_FFMI[sex]} ou plus).`;
}

// --- Validation des données relues du stockage -------------------------------

function isMeasurement(v: unknown): v is MeasurementEntry {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    isIsoDate(v.date) &&
    isFiniteNumber(v.neckCm) &&
    isFiniteNumber(v.waistCm) &&
    (v.hipCm === null || isFiniteNumber(v.hipCm))
  );
}

export function isPoidsData(v: unknown): v is PoidsData {
  return (
    isRecord(v) &&
    (v.sex === null || isOneOf(SEXES, v.sex)) &&
    isOneOf(MODES, v.mode) &&
    Array.isArray(v.measurements) &&
    v.measurements.every(isMeasurement)
  );
}
