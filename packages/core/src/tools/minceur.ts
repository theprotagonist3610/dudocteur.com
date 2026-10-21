// Logique de l'outil « Programme minceur ».
// À visée informative uniquement : ne remplace pas un avis médical.
//
// Le programme s'appuie sur les autres outils, sans rien ressaisir :
// poids et taille (pesées de l'IMC), sexe et masse maigre (Masse maigre),
// besoins énergétiques (Besoins énergétiques). Son objectif est un objectif de l'IMC.
import { formatDecimal, isOneOf, isRecord } from "../types";
import { daysBetween, inRange, isIsoDate, parseDecimal, toIsoLocal, todayIso, type InputErrors } from "../utils";
import { computeBmi, MAX_KG_PER_WEEK, NORMAL_BMI_RANGE, WEIGHT_RANGE } from "./imc";
import type { BiologicalSex } from "./poids";

export const MINCEUR_TOOL_ID = "programme-minceur";

export { formatDate, formatInteger, todayIso } from "../utils";

// --- Rythme de perte ---------------------------------------------------------

// 0,5 à 1 kg par semaine : le rythme recommandé, le même plafond que les objectifs de l'IMC.
export const PACES = [0.5, 0.75, 1] as const;
export type Pace = (typeof PACES)[number];

// Énergie contenue dans 1 kg de masse corporelle perdue (valeur de référence usuelle).
export const KCAL_PER_KG = 7700;

// Apport quotidien à ne jamais descendre sans suivi médical.
export const MIN_INTAKE_KCAL: Record<BiologicalSex, number> = { femme: 1200, homme: 1500 };

export interface IntakePlan {
  intakeKcal: number; // apport conseillé par jour
  deficitKcal: number; // déficit par jour réellement appliqué
  effectivePace: number; // kg par semaine obtenus avec ce déficit
  limited: boolean; // true si l'apport minimal a réduit le déficit voulu
}

/*
  Apport conseillé = besoins − déficit du rythme choisi (rythme × 7 700 kcal / 7 jours).
  L'apport ne descend jamais sous le minimum : le déficit, donc le rythme, est alors réduit.
*/
export function intakePlan(needsKcal: number, pace: Pace, sex: BiologicalSex): IntakePlan {
  const wanted = Math.round((pace * KCAL_PER_KG) / 7);
  const min = MIN_INTAKE_KCAL[sex];
  const intakeKcal = Math.max(needsKcal - wanted, min);
  const deficitKcal = Math.max(needsKcal - intakeKcal, 0);
  return {
    intakeKcal,
    deficitKcal,
    effectivePace: Math.round(((deficitKcal * 7) / KCAL_PER_KG) * 100) / 100,
    limited: deficitKcal < wanted,
  };
}

// Nombre de jours pour perdre `lossKg` au rythme donné (arrondi au jour supérieur).
export function daysToLose(lossKg: number, paceKgPerWeek: number): number | null {
  if (lossKg <= 0) return 0;
  if (paceKgPerWeek <= 0) return null;
  return Math.ceil((lossKg / paceKgPerWeek) * 7);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoLocal(d);
}

// --- Poids visé et sécurité --------------------------------------------------

// Poids proposé par défaut : celui d'un IMC de 24,9 (haut de la zone normale), arrondi à 0,5 kg.
export function suggestedTargetKg(currentKg: number, heightCm: number): number | null {
  const heightM = heightCm / 100;
  const target = Math.floor(24.9 * heightM * heightM * 2) / 2;
  return target < currentKg ? target : null;
}

// À partir de cet IMC, le programme recommande d'en parler à un médecin (accompagnement possible).
export const DOCTOR_BMI = 35;

export type Eligibility = "ok" | "maigreur";

// Pas de programme minceur en cas d'insuffisance pondérale.
export function eligibility(currentKg: number, heightCm: number): Eligibility {
  return computeBmi(currentKg, heightCm) < NORMAL_BMI_RANGE.min ? "maigreur" : "ok";
}

export interface PlanInput {
  targetWeightKg: string;
  pace: Pace;
  rhythm: MealRhythm;
  diet: Diet;
  adult: boolean; // 18 ans ou plus
  notPregnant: boolean; // femme : ni enceinte ni allaitante
}

export function validatePlanInput(
  input: PlanInput,
  current: { weightKg: number; heightCm: number; sex: BiologicalSex },
): { errors: InputErrors<PlanInput>; targetWeightKg?: number } {
  const errors: InputErrors<PlanInput> = {};
  const target = parseDecimal(input.targetWeightKg);
  if (!inRange(target, WEIGHT_RANGE)) {
    errors.targetWeightKg = `Entre ${WEIGHT_RANGE.min} et ${WEIGHT_RANGE.max} kg.`;
  } else if (target >= current.weightKg) {
    errors.targetWeightKg = `Inférieur à votre poids actuel (${formatDecimal(current.weightKg)} kg).`;
  } else if (computeBmi(target, current.heightCm) < NORMAL_BMI_RANGE.min) {
    const min = Math.ceil(NORMAL_BMI_RANGE.min * (current.heightCm / 100) ** 2 * 2) / 2;
    errors.targetWeightKg = `Trop bas : en dessous de ${formatDecimal(min)} kg, votre IMC passerait sous ${formatDecimal(NORMAL_BMI_RANGE.min)} (maigreur).`;
  }
  if (!input.adult) errors.adult = "Ce programme est réservé aux adultes.";
  if (current.sex === "femme" && !input.notPregnant) {
    errors.notPregnant = "Pas de programme minceur pendant la grossesse ou l'allaitement.";
  }
  if (Object.keys(errors).length > 0) return { errors };
  return { errors, targetWeightKg: target };
}

// --- Programme en cours ------------------------------------------------------

export const MEAL_RHYTHMS = ["classique", "14-10", "16-8"] as const;
export type MealRhythm = (typeof MEAL_RHYTHMS)[number];

export const DIETS = ["mediterraneen", "proteines", "volume"] as const;
export type Diet = (typeof DIETS)[number];

export interface Plan {
  startDate: string;
  startWeightKg: number;
  targetWeightKg: number;
  pace: Pace; // rythme choisi
  // Fixés au démarrage : la trajectoire ne bouge pas quand les besoins baissent avec le poids.
  effectivePace: number; // kg par semaine réellement visés (apport minimal compris)
  endDate: string; // date estimée d'arrivée, aussi échéance de l'objectif IMC
  rhythm: MealRhythm;
  diet: Diet;
  goalId: string | null; // objectif créé dans l'IMC pour ce programme
}

// Poids attendu à une date sur la trajectoire du programme (jamais sous le poids visé).
export function expectedWeightKg(plan: Plan, paceKgPerWeek: number, date: string): number {
  const days = Math.max(daysBetween(plan.startDate, date), 0);
  return Math.max(plan.targetWeightKg, Math.round((plan.startWeightKg - (paceKgPerWeek * days) / 7) * 10) / 10);
}

export interface Progress {
  lostKg: number;
  remainingKg: number;
  percent: number; // 0 à 100
  // Écart à la trajectoire : positif = en avance (plus léger que prévu).
  aheadKg: number;
}

export function progress(plan: Plan, latestWeightKg: number, paceKgPerWeek: number, today: string = todayIso()): Progress {
  const total = plan.startWeightKg - plan.targetWeightKg;
  const lostKg = Math.round((plan.startWeightKg - latestWeightKg) * 10) / 10;
  const remainingKg = Math.max(Math.round((latestWeightKg - plan.targetWeightKg) * 10) / 10, 0);
  const percent = total > 0 ? Math.min(Math.max(Math.round((lostKg / total) * 100), 0), 100) : 0;
  const aheadKg = Math.round((expectedWeightKg(plan, paceKgPerWeek, today) - latestWeightKg) * 10) / 10;
  return { lostKg, remainingKg, percent, aheadKg };
}

// --- Habitudes de la semaine -------------------------------------------------

export const HABITS = ["pesee", "eau", "sommeil", "marche", "renforcement", "repas"] as const;
export type Habit = (typeof HABITS)[number];

export const HABIT_LABELS: Record<Habit, { label: string; detail: string }> = {
  pesee: { label: "Me peser", detail: "Au moins une fois, dans l'outil IMC (cochée automatiquement)." },
  eau: { label: "Boire de l'eau", detail: "À la place des sodas, jus sucrés et boissons alcoolisées." },
  sommeil: { label: "Bien dormir", detail: "Environ 7 heures par nuit : le manque de sommeil augmente l'appétit." },
  marche: { label: "Bouger 150 minutes", detail: "Marche rapide, vélo, danse… par exemple 30 minutes, 5 jours." },
  renforcement: { label: "2 séances de renforcement", detail: "Pour garder vos muscles pendant la perte de poids." },
  repas: { label: "Respecter mon rythme de repas", detail: "Les horaires et les portions de votre programme." },
};

// Lundi de la semaine d'une date (les habitudes se cochent par semaine).
export function weekStartIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const shift = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - shift);
  return toIsoLocal(d);
}

// Une pesée a-t-elle été faite cette semaine (lundi → aujourd'hui) ?
export function weighedThisWeek(entryDates: string[], today: string = todayIso()): boolean {
  const monday = weekStartIso(today);
  return entryDates.some((date) => date >= monday && date <= today);
}

export interface MinceurData {
  plan: Plan | null;
  // Habitudes cochées, par semaine (clé : lundi AAAA-MM-JJ). La pesée est déduite de l'IMC.
  habits: Record<string, Habit[]>;
}

export const EMPTY_MINCEUR_DATA: MinceurData = { plan: null, habits: {} };

// --- Conseils ----------------------------------------------------------------

export const MEAL_RHYTHM_INFO: Record<MealRhythm, { label: string; summary: string; tips: string[] }> = {
  classique: {
    label: "3 repas",
    summary: "Trois repas à heures régulières, sans grignotage entre les repas.",
    tips: [
      "Prenez un petit-déjeuner, un déjeuner et un dîner, à peu près aux mêmes heures chaque jour.",
      "Si la faim vient entre deux repas : un fruit ou un yaourt nature plutôt qu'un beignet.",
      "Évitez de manger tard le soir, devant la télévision ou le téléphone.",
    ],
  },
  "14-10": {
    label: "Jeûne 14/10",
    summary: "Vos repas dans une plage de 10 heures, par exemple de 9 h à 19 h, puis 14 heures sans manger.",
    tips: [
      "Dans la plage de 10 heures, mangez normalement, sans compenser.",
      "Pendant le jeûne : eau, thé ou café sans sucre uniquement.",
      "C'est la forme la plus douce de jeûne : bonne pour commencer.",
    ],
  },
  "16-8": {
    label: "Jeûne 16/8",
    summary: "Vos repas dans une plage de 8 heures, par exemple de 12 h à 20 h, puis 16 heures sans manger.",
    tips: [
      "Deux repas complets dans la plage de 8 heures, sans compenser par de grosses portions.",
      "Pendant le jeûne : eau, thé ou café sans sucre uniquement.",
      "Si vous avez des vertiges ou une grande fatigue, revenez au jeûne 14/10.",
    ],
  },
};

// Avertissement affiché pour tout jeûne.
export const FASTING_WARNING =
  "Diabète traité, maladie chronique ou médicaments à prendre en mangeant : demandez l'avis de votre médecin avant de jeûner.";

export const DIET_INFO: Record<Diet, { label: string; summary: string; tips: string[] }> = {
  mediterraneen: {
    label: "Méditerranéen",
    summary: "Beaucoup de légumes, du poisson, des légumineuses et peu de graisses cuites.",
    tips: [
      "Légumes à chaque repas : gombo, crin-crin, épinards (gboman), tomates, aubergines.",
      "Poisson deux à trois fois par semaine (tilapia, chinchard, sardine), plutôt grillé ou en sauce légère.",
      "Légumineuses plusieurs fois par semaine : niébé, haricots, lentilles.",
      "Huile en petite quantité : une cuillère par personne plutôt qu'une sauce baignant dans l'huile rouge.",
      "Fruits entiers au dessert : orange, papaye, ananas, mangue.",
    ],
  },
  proteines: {
    label: "Riche en protéines",
    summary: "Une source de protéines à chaque repas : elles rassasient et protègent vos muscles.",
    tips: [
      "À chaque repas : poisson, œufs, poulet sans la peau, viande maigre, wagashi, soja ou niébé.",
      "Une portion de protéines de la taille de la paume de la main par repas.",
      "Réduisez d'autant la pâte, l'igname ou le riz dans l'assiette.",
      "Évitez les viandes frites et les charcuteries, riches en graisses.",
    ],
  },
  volume: {
    label: "Grandes assiettes légères",
    summary: "Manger à sa faim avec des aliments peu caloriques : légumes, soupes, fruits.",
    tips: [
      "La moitié de l'assiette en légumes, un quart de protéines, un quart de féculents (pâte, akassa, igname, riz).",
      "Commencez le repas par une soupe ou une sauce de légumes peu grasse.",
      "Limitez les fritures : akara, beignets, plantain frit, alloco.",
      "Sauce d'arachide et huile rouge avec modération : elles sont très caloriques.",
      "Préférez les fruits entiers aux jus, même maison.",
    ],
  },
};

// Conseils de mouvement (l'activité n'entre pas dans le calcul : c'est un levier en plus du déficit).
export const ACTIVITY_TIPS = [
  "Marche rapide : 30 minutes, 5 jours par semaine (150 minutes au total), d'un seul coup ou en plusieurs fois.",
  "Renforcement musculaire 2 fois par semaine : squats, pompes contre un mur, gainage, montées de marches.",
  "Bougez au quotidien : escaliers plutôt qu'ascenseur, descendre du zémidjan un peu avant, marcher en téléphonant.",
  "Garder vos muscles, c'est garder votre métabolisme : suivez votre masse maigre dans l'outil Masse maigre.",
];

// Conseils communs à tous les programmes.
export const GENERAL_TIPS = [
  "Remplacez les sodas, jus sucrés, bière et sodabi par de l'eau : c'est souvent le gain le plus facile.",
  "Servez-vous une seule fois, dans une assiette plus petite, et mangez lentement.",
  "Pesez-vous une fois par semaine, le même jour, le matin à jeun.",
];

// --- Validation des données relues du stockage -------------------------------

function isPlan(v: unknown): v is Plan {
  return (
    isRecord(v) &&
    isIsoDate(v.startDate) &&
    typeof v.startWeightKg === "number" &&
    typeof v.targetWeightKg === "number" &&
    (PACES as readonly number[]).includes(v.pace as number) &&
    typeof v.effectivePace === "number" &&
    isIsoDate(v.endDate) &&
    isOneOf(MEAL_RHYTHMS, v.rhythm) &&
    isOneOf(DIETS, v.diet) &&
    (v.goalId === null || typeof v.goalId === "string")
  );
}

export function isMinceurData(v: unknown): v is MinceurData {
  return (
    isRecord(v) &&
    (v.plan === null || isPlan(v.plan)) &&
    isRecord(v.habits) &&
    Object.entries(v.habits).every(
      ([week, list]) => isIsoDate(week) && Array.isArray(list) && list.every((h) => isOneOf(HABITS, h)),
    )
  );
}

export { MAX_KG_PER_WEEK };
