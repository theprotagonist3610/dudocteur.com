import { describe, expect, it } from "vitest";
import { validateGoal } from "./imc";
import {
  addDays,
  daysToLose,
  eligibility,
  expectedWeightKg,
  intakePlan,
  isMinceurData,
  progress,
  suggestedTargetKg,
  validatePlanInput,
  weekStartIso,
  weighedThisWeek,
  type Plan,
  type PlanInput,
} from "./minceur";

describe("apport conseillé = besoins − déficit du rythme", () => {
  it("0,5 kg par semaine : 550 kcal de déficit par jour", () => {
    // 0,5 × 7 700 / 7 = 550.
    expect(intakePlan(2152, 0.5, "homme")).toEqual({ intakeKcal: 1602, deficitKcal: 550, effectivePace: 0.5, limited: false });
  });

  it("1 kg par semaine : 1 100 kcal de déficit, mais jamais sous l'apport minimal", () => {
    // 2 152 − 1 100 = 1 052 < 1 500 (homme) : l'apport est relevé, le rythme réel baisse.
    const plan = intakePlan(2152, 1, "homme");
    expect(plan).toMatchObject({ intakeKcal: 1500, deficitKcal: 652, limited: true });
    expect(plan.effectivePace).toBeCloseTo(0.59, 2);
  });

  it("minimum de 1 200 kcal pour une femme", () => {
    expect(intakePlan(1800, 1, "femme")).toMatchObject({ intakeKcal: 1200, deficitKcal: 600, limited: true });
  });

  it("besoins déjà au minimum : aucun déficit possible", () => {
    expect(intakePlan(1400, 0.5, "homme")).toMatchObject({ intakeKcal: 1500, deficitKcal: 0, effectivePace: 0 });
  });
});

describe("durée et trajectoire", () => {
  it("compte les jours pour perdre un poids donné", () => {
    expect(daysToLose(5, 0.5)).toBe(70);
    expect(daysToLose(5, 0.59)).toBe(60);
    expect(daysToLose(0, 0.5)).toBe(0);
    expect(daysToLose(5, 0)).toBeNull();
  });

  it("ajoute des jours à une date", () => {
    expect(addDays("2026-10-20", 70)).toBe("2026-12-29");
  });

  it("l'objectif créé dans l'IMC respecte la règle de rythme de l'IMC (1 kg par semaine au plus)", () => {
    const entries = [{ id: "p", date: "2026-10-20", weightKg: 82, heightCm: 175 }];
    for (const pace of [0.5, 0.75, 1]) {
      const days = daysToLose(6, pace)!;
      expect(validateGoal({ date: addDays("2026-10-20", days), weightKg: 76 }, entries, [], "2026-10-20")).toBeNull();
    }
  });

  const plan: Plan = {
    startDate: "2026-10-01",
    startWeightKg: 82,
    targetWeightKg: 78,
    pace: 0.5,
    effectivePace: 0.5,
    endDate: "2026-11-26",
    rhythm: "classique",
    diet: "volume",
    goalId: null,
  };

  it("donne le poids attendu sur la trajectoire, jamais sous le poids visé", () => {
    expect(expectedWeightKg(plan, 0.5, "2026-10-01")).toBe(82);
    expect(expectedWeightKg(plan, 0.5, "2026-10-15")).toBe(81);
    expect(expectedWeightKg(plan, 0.5, "2027-06-01")).toBe(78);
  });

  it("mesure la progression et l'avance sur la trajectoire", () => {
    // Le 15 octobre, attendu 81 kg : à 80,5 kg, 0,5 kg d'avance.
    expect(progress(plan, 80.5, 0.5, "2026-10-15")).toEqual({ lostKg: 1.5, remainingKg: 2.5, percent: 38, aheadKg: 0.5 });
    expect(progress(plan, 81.4, 0.5, "2026-10-15").aheadKg).toBe(-0.4);
    expect(progress(plan, 77.5, 0.5, "2026-12-01")).toMatchObject({ remainingKg: 0, percent: 100 });
  });
});

describe("poids visé et sécurité", () => {
  it("propose le poids d'un IMC de 24,9, s'il est sous le poids actuel", () => {
    // 24,9 × 1,75² = 76,26 → 76 kg (arrondi à 0,5 kg en dessous).
    expect(suggestedTargetKg(82, 175)).toBe(76);
    expect(suggestedTargetKg(70, 175)).toBeNull();
  });

  it("refuse le programme en cas d'insuffisance pondérale", () => {
    expect(eligibility(55, 175)).toBe("maigreur");
    expect(eligibility(70, 175)).toBe("ok");
  });

  const current = { weightKg: 82, heightCm: 175, sex: "femme" as const };
  const input: PlanInput = { targetWeightKg: "76", pace: 0.5, rhythm: "classique", diet: "volume", adult: true, notPregnant: true };

  it("accepte un poids visé valide (virgule comprise)", () => {
    expect(validatePlanInput({ ...input, targetWeightKg: "76,5" }, current)).toEqual({ errors: {}, targetWeightKg: 76.5 });
  });

  it("refuse un poids visé supérieur au poids actuel, ou qui ferait passer en maigreur", () => {
    expect(validatePlanInput({ ...input, targetWeightKg: "85" }, current).errors.targetWeightKg).toMatch(/Inférieur/);
    expect(validatePlanInput({ ...input, targetWeightKg: "55" }, current).errors.targetWeightKg).toMatch(/Trop bas : en dessous de 57 kg/);
  });

  it("exige d'être adulte, et pour une femme, ni enceinte ni allaitante", () => {
    const { errors } = validatePlanInput({ ...input, adult: false, notPregnant: false }, current);
    expect(Object.keys(errors).sort()).toEqual(["adult", "notPregnant"]);
    expect(validatePlanInput({ ...input, notPregnant: false }, { ...current, sex: "homme" }).errors).toEqual({});
  });
});

describe("habitudes de la semaine", () => {
  it("rattache une date au lundi de sa semaine", () => {
    expect(weekStartIso("2026-10-21")).toBe("2026-10-19"); // mercredi → lundi
    expect(weekStartIso("2026-10-19")).toBe("2026-10-19"); // lundi
    expect(weekStartIso("2026-10-25")).toBe("2026-10-19"); // dimanche
  });

  it("détecte une pesée de l'IMC faite cette semaine", () => {
    expect(weighedThisWeek(["2026-10-12", "2026-10-20"], "2026-10-21")).toBe(true);
    expect(weighedThisWeek(["2026-10-12"], "2026-10-21")).toBe(false);
  });
});

describe("données relues du téléphone", () => {
  it("accepte des données valides et refuse des données abîmées", () => {
    expect(isMinceurData({ plan: null, habits: {} })).toBe(true);
    expect(
      isMinceurData({
        plan: { startDate: "2026-10-01", startWeightKg: 82, targetWeightKg: 78, pace: 0.75, effectivePace: 0.75, endDate: "2026-11-08", rhythm: "16-8", diet: "proteines", goalId: "g" },
        habits: { "2026-10-19": ["eau", "sommeil"] },
      }),
    ).toBe(true);
    expect(isMinceurData({ plan: { startDate: "x" }, habits: {} })).toBe(false);
    expect(isMinceurData({ plan: null, habits: { "2026-10-19": ["voler"] } })).toBe(false);
    expect(isMinceurData({ plan: { startDate: "2026-10-01", startWeightKg: 82, targetWeightKg: 78, pace: 2, effectivePace: 2, endDate: "2026-11-01", rhythm: "classique", diet: "volume", goalId: null }, habits: {} })).toBe(false);
  });
});
