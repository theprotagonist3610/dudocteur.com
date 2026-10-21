import { describe, expect, it } from "vitest";
import { computeEnergyNeeds, isEnergieData, type EnergyInputs } from "./energie";
import { latestComposition, type MeasurementEntry } from "./poids";

// Cas de référence : masse maigre 59,7 kg (homme, 76,5 kg, 175 cm, James), bureau 5 jours par semaine.
const INPUTS: EnergyInputs = { leanMassKg: 59.7, job: "bureau", workDaysPerWeek: 5 };

describe("besoin énergétique total = métabolisme de base + métier + digestion", () => {
  it("additionne les trois composantes", () => {
    const needs = computeEnergyNeeds(INPUTS);
    // Digestion : 10 % de (1 659,52 + 296,34).
    expect(needs.components).toEqual({ metabolisme: 1660, metier: 296, digestion: 196 });
    expect(needs.dailyKcal).toBe(2152);
  });

  it("garde la dépense du métier sur la semaine, répartie ensuite sur 7 jours", () => {
    // 1 659,52 kcal (métabolisme exact) × 25 % × 5 jours = 2 074 kcal/semaine, soit 296 kcal/jour.
    const needs = computeEnergyNeeds(INPUTS);
    expect(needs.weeklyMetierKcal).toBe(2074);
    expect(needs.components.metier).toBe(Math.round(2074 / 7));
  });

  it("donne les besoins hebdomadaire et mensuel", () => {
    const needs = computeEnergyNeeds(INPUTS);
    expect(needs.weeklyKcal).toBe(2152 * 7);
    expect(needs.monthlyKcal).toBe(65502);
  });

  it("un métier plus physique ou plus de jours travaillés augmentent les besoins", () => {
    const base = computeEnergyNeeds(INPUTS).dailyKcal;
    expect(computeEnergyNeeds({ ...INPUTS, job: "intense" }).dailyKcal).toBeGreaterThan(base);
    expect(computeEnergyNeeds({ ...INPUTS, workDaysPerWeek: 6 }).dailyKcal).toBeGreaterThan(base);
  });

  it("sans jour travaillé, il reste métabolisme et digestion", () => {
    const needs = computeEnergyNeeds({ ...INPUTS, workDaysPerWeek: 0 });
    expect(needs.components.metier).toBe(0);
    expect(needs.dailyKcal).toBe(1660 + 166);
  });
});

describe("cohérence avec l'outil Masse maigre", () => {
  const entries = [
    { id: "p1", date: "2026-10-01", weightKg: 78, heightCm: 175 },
    { id: "p2", date: "2026-10-07", weightKg: 76.5, heightCm: 175 },
  ];
  const measurements: MeasurementEntry[] = [{ id: "m1", date: "2026-10-01", neckCm: 38, waistCm: 90, hipCm: null }];

  it("sans sexe renseigné, pas de composition", () => {
    expect(latestComposition({ sex: null, mode: "estimatif", measurements: [] }, entries)).toBeNull();
  });

  it("mode estimatif : la dernière pesée, et le même métabolisme que l'outil Masse maigre", () => {
    const row = latestComposition({ sex: "homme", mode: "estimatif", measurements }, entries)!;
    expect(row).toMatchObject({ date: "2026-10-07", formula: "james", leanMassKg: 59.7, bmrKcal: 1660 });
    expect(computeEnergyNeeds({ ...INPUTS, leanMassKg: row.leanMassKg }).components.metabolisme).toBe(row.bmrKcal);
  });

  it("mode mensurations : la dernière prise de mensurations", () => {
    const row = latestComposition({ sex: "homme", mode: "manuel", measurements }, entries)!;
    expect(row).toMatchObject({ date: "2026-10-01", formula: "navy", weightKg: 78 });
  });

  it("mode mensurations sans prise calculable : estimation depuis la dernière pesée", () => {
    const row = latestComposition({ sex: "homme", mode: "manuel", measurements: [] }, entries)!;
    expect(row).toMatchObject({ date: "2026-10-07", formula: "james" });
  });
});

describe("données relues du téléphone", () => {
  it("accepte une activité valide, y compris enregistrée par l'ancienne version (avec le sport)", () => {
    expect(isEnergieData({ activity: { job: "bureau", workDaysPerWeek: 5 } })).toBe(true);
    expect(
      isEnergieData({ activity: { job: "leger", workDaysPerWeek: 5, sportMinutesPerWeek: 20, sportIntensity: "legere" } }),
    ).toBe(true);
  });

  it("refuse des données abîmées", () => {
    expect(isEnergieData({ activity: { job: "pilote", workDaysPerWeek: 5 } })).toBe(false);
    expect(isEnergieData({ activity: { job: "bureau", workDaysPerWeek: 9 } })).toBe(false);
    expect(isEnergieData(null)).toBe(false);
  });
});
