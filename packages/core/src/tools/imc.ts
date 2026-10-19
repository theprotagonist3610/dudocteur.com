// Logique de l'outil IMC. À visée informative uniquement : ne remplace pas un avis médical.
// Le reste de l'outil (tendances, commentaires, objectifs) est décrit dans le README.

export const BMI_CATEGORIES = [
  "Insuffisance pondérale",
  "Corpulence normale",
  "Surpoids",
  "Obésité modérée",
  "Obésité sévère",
  "Obésité morbide",
] as const;

export type BmiCategory = (typeof BMI_CATEGORIES)[number];

export const WEIGHT_RANGE = { min: 20, max: 300 } as const;
export const HEIGHT_RANGE = { min: 100, max: 250 } as const;

// IMC de référence pour le poids idéal.
export const IDEAL_BMI = 22;

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

// Poids correspondant à un IMC de 22 pour une taille donnée, arrondi à 0,1 kg.
export function idealWeightKg(heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round(IDEAL_BMI * heightM * heightM * 10) / 10;
}
