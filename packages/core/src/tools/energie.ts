// Logique de l'outil « Dépense et besoins énergétiques ».
// À visée informative uniquement : ne remplace pas un avis médical.
import { isFiniteNumber, isOneOf, isRecord } from "../types";
import { inRange } from "../utils";

export const ENERGIE_TOOL_ID = "besoins-energetiques";

// Outil « Programme minceur », proposé une fois les besoins connus.
export const MINCEUR_TOOL_ID = "programme-minceur";

export { formatInteger } from "../utils";

// --- Types -------------------------------------------------------------------

export const JOBS = ["bureau", "leger", "modere", "intense"] as const;
export type JobActivity = (typeof JOBS)[number];

/*
  Origine de la masse maigre, qui sert au métabolisme de base. C'est toujours
  celle qu'affiche l'outil Masse maigre (même valeur dans les deux outils) :
  estimée par James ou Boer depuis la pesée, ou déduite des mensurations.
*/
export type LeanMassSource = "james" | "boer" | "navy";

// Activité au travail : seule donnée propre à cet outil (la masse maigre vient de l'outil Masse maigre).
export interface Activity {
  job: JobActivity;
  workDaysPerWeek: number;
}

export interface EnergieData {
  activity: Activity;
}

export const EMPTY_ENERGIE_DATA: EnergieData = {
  activity: { job: "bureau", workDaysPerWeek: 5 },
};

export interface EnergyInputs extends Activity {
  leanMassKg: number;
}

export type EnergyComponent = "metabolisme" | "metier" | "digestion";

export interface EnergyNeeds {
  // Composantes du besoin quotidien moyen (kcal/jour).
  components: Record<EnergyComponent, number>;
  // Dépense du métier sur la semaine (kcal/semaine), avant sa répartition sur 7 jours :
  // affichée pour expliquer la moyenne par jour.
  weeklyMetierKcal: number;
  dailyKcal: number;
  weeklyKcal: number;
  monthlyKcal: number;
}

// --- Métabolisme de base -----------------------------------------------------

// Katch-McArdle : 370 + 21,6 × masse maigre (kg) — même formule que l'outil Masse maigre.
export const katchMcArdleKcal = (leanMassKg: number) => 370 + 21.6 * leanMassKg;

export const LEAN_MASS_SOURCE_LABELS: Record<LeanMassSource, string> = {
  james: "estimée par James",
  boer: "estimée par Boer",
  navy: "d'après vos mensurations",
};

// --- Activité liée au métier -------------------------------------------------

/*
  Dépense liée au métier, les jours travaillés, en part du métabolisme de base.
  Valeurs indicatives, cohérentes avec les niveaux d'activité physique de la FAO/OMS.
*/
export const JOB_ACTIVITIES: Record<JobActivity, { label: string; examples: string; factor: number }> = {
  bureau: { label: "Assis la plupart du temps", examples: "bureau, chauffeur, informatique", factor: 0.25 },
  leger: { label: "Debout, peu physique", examples: "vente, enseignement, coiffure", factor: 0.45 },
  modere: { label: "Physique modéré", examples: "infirmier, artisan, serveur", factor: 0.65 },
  intense: { label: "Physique intense", examples: "BTP, agriculture, manutention", factor: 0.9 },
};

// Thermogenèse alimentaire : environ 10 % de la dépense pour digérer les repas.
export const DIGESTION_SHARE = 0.1;

// Mois moyen : 365,25 / 12 jours.
export const DAYS_PER_MONTH = 365.25 / 12;

/*
  Besoin énergétique total = métabolisme de base + activité liée au métier + digestion.
  Le métier n'est pas quotidien : sa dépense de la semaine est ramenée à une moyenne par jour.
*/
export function computeEnergyNeeds(inputs: EnergyInputs): EnergyNeeds {
  const metabolisme = katchMcArdleKcal(inputs.leanMassKg);
  const metierWeek = metabolisme * JOB_ACTIVITIES[inputs.job].factor * inputs.workDaysPerWeek;
  const metier = metierWeek / 7;
  const digestion = DIGESTION_SHARE * (metabolisme + metier);

  const components = {
    metabolisme: Math.round(metabolisme),
    metier: Math.round(metier),
    digestion: Math.round(digestion),
  };
  const dailyKcal = components.metabolisme + components.metier + components.digestion;
  return {
    components,
    weeklyMetierKcal: Math.round(metierWeek),
    dailyKcal,
    weeklyKcal: dailyKcal * 7,
    monthlyKcal: Math.round(dailyKcal * DAYS_PER_MONTH),
  };
}

export const WORK_DAYS_RANGE = { min: 0, max: 7 } as const;

// --- Validation des données relues du stockage -------------------------------

function isActivity(v: unknown): v is Activity {
  return (
    isRecord(v) &&
    isOneOf(JOBS, v.job) &&
    isFiniteNumber(v.workDaysPerWeek) &&
    inRange(v.workDaysPerWeek, WORK_DAYS_RANGE)
  );
}

export function isEnergieData(v: unknown): v is EnergieData {
  return isRecord(v) && isActivity(v.activity);
}
