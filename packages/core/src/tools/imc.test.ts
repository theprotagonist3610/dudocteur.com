import { describe, expect, it } from "vitest";
import {
  assessTrend,
  bmiCategory,
  buildRows,
  computeBmi,
  constantHeightCm,
  findEntryOnDate,
  goalProgress,
  idealWeightKg,
  isImcData,
  maxWeightChangeKg,
  newGoal,
  niceTicks,
  parseDecimal,
  realisticRange,
  removeById,
  replaceEntryOnDate,
  toIsoLocal,
  toneFor,
  trendOf,
  validateEntryInput,
  validateGoal,
  validateGoalInput,
} from "./imc";

describe("computeBmi", () => {
  it("calcule l'IMC et arrondit à une décimale", () => {
    expect(computeBmi(70, 175)).toBe(22.9);
    expect(computeBmi(76.5, 175)).toBe(25);
  });
});

describe("bmiCategory", () => {
  it("applique les seuils OMS", () => {
    expect(bmiCategory(17)).toBe("Insuffisance pondérale");
    expect(bmiCategory(18.5)).toBe("Corpulence normale");
    expect(bmiCategory(24.9)).toBe("Corpulence normale");
    expect(bmiCategory(25)).toBe("Surpoids");
    expect(bmiCategory(32)).toBe("Obésité modérée");
    expect(bmiCategory(37)).toBe("Obésité sévère");
    expect(bmiCategory(42)).toBe("Obésité morbide");
  });
});

describe("trendOf", () => {
  it("distingue première prise, hausse, baisse et stabilité", () => {
    expect(trendOf(null)).toBe("premiere");
    expect(trendOf(0.3)).toBe("hausse");
    expect(trendOf(-0.2)).toBe("baisse");
    expect(trendOf(0)).toBe("stable");
    expect(trendOf(0.05)).toBe("stable");
  });
});

describe("buildRows", () => {
  it("trie par date et calcule la tendance par rapport à la prise précédente", () => {
    const rows = buildRows([
      { id: "b", date: "2026-01-10", weightKg: 72, heightCm: 175 },
      { id: "a", date: "2026-01-01", weightKg: 70, heightCm: 175 },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({ bmi: 22.9, trend: "premiere", bmiDelta: null });
    expect(rows[1]).toMatchObject({ bmi: 23.5, trend: "hausse", bmiDelta: 0.6 });
  });
});

describe("niceTicks", () => {
  it("produit des graduations rondes qui encadrent les valeurs", () => {
    const { domain, ticks } = niceTicks(24, 26.5, 5);
    expect(ticks).toEqual([24, 25, 26, 27]);
    expect(domain).toEqual([24, 27]);
    expect(niceTicks(24, 26.5, 6).ticks).toEqual([24, 24.5, 25, 25.5, 26, 26.5]);
  });

  it("élargit le pas quand l'écart est grand", () => {
    expect(niceTicks(75.2, 80.2, 5).ticks).toEqual([74, 76, 78, 80, 82]);
  });
});

describe("toIsoLocal", () => {
  it("formate la date dans le fuseau local", () => {
    expect(toIsoLocal(new Date(2026, 9, 9, 0, 30))).toBe("2026-10-09");
  });
});

describe("assessTrend : une variation est jugée sur son effet, pas sur son sens", () => {
  it("une hausse qui fait sortir de la maigreur est favorable", () => {
    expect(assessTrend(17.8, 18.9, "hausse")).toBe("favorable");
  });

  it("une hausse qui fait passer de normal à surpoids est défavorable", () => {
    expect(assessTrend(24.6, 25.4, "hausse")).toBe("defavorable");
  });

  it("une baisse en surpoids est favorable, une baisse en maigreur défavorable", () => {
    expect(assessTrend(27, 26.4, "baisse")).toBe("favorable");
    expect(assessTrend(18, 17.5, "baisse")).toBe("defavorable");
  });

  it("rester dans la zone normale ou ne pas bouger est neutre", () => {
    expect(assessTrend(21, 21.6, "hausse")).toBe("neutre");
    expect(assessTrend(27, 27, "stable")).toBe("neutre");
    expect(assessTrend(null, 27, "premiere")).toBe("neutre");
  });
});

describe("toneFor", () => {
  it("vert si normal, orange si hors norme sans aggravation, rouge si ça s'aggrave", () => {
    expect(toneFor(22, "neutre")).toBe("success");
    expect(toneFor(27, "favorable")).toBe("warning");
    expect(toneFor(27, "neutre")).toBe("warning");
    expect(toneFor(17, "defavorable")).toBe("danger");
  });
});

describe("commentaires personnalisés", () => {
  const comments = (weights: number[]) =>
    buildRows(
      weights.map((w, i) => ({
        id: String(i),
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        weightKg: w,
        heightCm: 175,
      })),
    ).map((r) => r.comment);

  it("surpoids stable : souligne le bon côté", () => {
    expect(comments([82, 82])[1]).toBe("Vous êtes en surpoids. Mais le bon côté, votre poids est resté stable.");
  });

  it("retour dans la zone normale : félicite", () => {
    expect(comments([78, 76])[1]).toContain("Bravo, votre IMC est revenu dans la zone normale");
  });

  it("surpoids qui s'aggrave : alerte", () => {
    expect(comments([80, 82])[1]).toContain("Attention : votre IMC s'éloigne de la zone normale");
  });
});

describe("idealWeightKg", () => {
  it("donne le poids d'un IMC de 22 pour la taille", () => {
    expect(idealWeightKg(175)).toBe(67.4);
  });
});

describe("constantHeightCm", () => {
  it("renvoie la taille si elle n'a jamais changé, sinon null", () => {
    expect(constantHeightCm([{ heightCm: 175 }, { heightCm: 175 }])).toBe(175);
    expect(constantHeightCm([{ heightCm: 120 }, { heightCm: 123.5 }])).toBeNull();
    expect(constantHeightCm([])).toBeNull();
  });
});

describe("un jour = une mesure", () => {
  const entries = [
    { id: "a", date: "2026-10-01", weightKg: 80, heightCm: 175 },
    { id: "b", date: "2026-10-02", weightKg: 79.5, heightCm: 175 },
  ];

  it("retrouve la prise déjà enregistrée à une date", () => {
    expect(findEntryOnDate(entries, "2026-10-02")?.id).toBe("b");
    expect(findEntryOnDate(entries, "2026-10-03")).toBeUndefined();
  });

  it("garder la nouvelle prise remplace l'ancienne du même jour", () => {
    const next = replaceEntryOnDate(entries, { id: "c", date: "2026-10-02", weightKg: 79.1, heightCm: 175 });
    expect(next.map((e) => e.id).sort()).toEqual(["a", "c"]);
  });

  it("une prise à une nouvelle date s'ajoute simplement", () => {
    expect(replaceEntryOnDate(entries, { id: "d", date: "2026-10-03", weightKg: 79, heightCm: 175 })).toHaveLength(3);
  });

  it("une prise se supprime par son identifiant", () => {
    expect(removeById(entries, "a").map((e) => e.id)).toEqual(["b"]);
  });
});

describe("saisie au clavier", () => {
  it("accepte la virgule comme le point décimal", () => {
    expect(parseDecimal("76,5")).toBe(76.5);
    expect(parseDecimal(" 76.5 ")).toBe(76.5);
    expect(parseDecimal("175")).toBe(175);
    expect(parseDecimal("")).toBeNaN();
    expect(parseDecimal("7a")).toBeNaN();
    expect(parseDecimal("-5")).toBeNaN();
  });

  it("valide une nouvelle prise", () => {
    const today = "2026-10-20";
    expect(validateEntryInput({ date: "2026-10-20", weightKg: "76,5", heightCm: "175" }, today)).toEqual({
      errors: {},
      entry: { date: "2026-10-20", weightKg: 76.5, heightCm: 175 },
    });
    const { errors, entry } = validateEntryInput({ date: "2026-10-21", weightKg: "10", heightCm: "" }, today);
    expect(entry).toBeUndefined();
    expect(Object.keys(errors).sort()).toEqual(["date", "heightCm", "weightKg"]);
  });

  it("valide un objectif : champs, puis rythme réaliste", () => {
    const today = "2026-10-09";
    const entries = [{ id: "p", date: "2026-10-09", weightKg: 76, heightCm: 175 }];
    expect(validateGoalInput({ date: "2026-10-20", weightKg: "74,5" }, entries, [], today).goal).toEqual({
      date: "2026-10-20",
      weightKg: 74.5,
    });
    expect(validateGoalInput({ date: "2026-10-09", weightKg: "x" }, entries, [], today).errors).toMatchObject({
      date: expect.any(String),
      weightKg: expect.any(String),
    });
    expect(validateGoalInput({ date: "2026-10-11", weightKg: "74" }, entries, [], today).errors.form).toMatch(
      /trop rapide/,
    );
  });
});

describe("goalProgress", () => {
  it("calcule le poids restant à perdre ou à prendre", () => {
    expect(goalProgress({ weightKg: 72 }, 76.2, 175)).toMatchObject({ remainingKg: 4.2, direction: "perdre" });
    expect(goalProgress({ weightKg: 60 }, 55, 165)).toMatchObject({ remainingKg: 5, direction: "prendre" });
    expect(goalProgress({ weightKg: 72 }, 72, 175).direction).toBe("atteint");
  });

  it("donne l'IMC qu'atteindrait l'objectif, pour signaler un objectif hors norme", () => {
    expect(goalProgress({ weightKg: 55 }, 76, 175)).toMatchObject({
      goalBmi: 18,
      goalCategory: "Insuffisance pondérale",
    });
  });
});

describe("maxWeightChangeKg : au plus 1 kg par semaine, proportionnellement aux jours", () => {
  it("applique la limite de 1 kg par semaine", () => {
    expect(maxWeightChangeKg(0)).toBe(0);
    expect(maxWeightChangeKg(7)).toBe(1);
    expect(maxWeightChangeKg(14)).toBe(2);
    expect(maxWeightChangeKg(28)).toBe(4);
    expect(maxWeightChangeKg(3)).toBeCloseTo(0.43, 2);
    expect(maxWeightChangeKg(10)).toBeCloseTo(1.43, 2);
  });
});

describe("validateGoal", () => {
  const today = "2026-10-09";
  const entries = [{ id: "p", date: "2026-10-09", weightKg: 76, heightCm: 175 }];

  it("refuse une échéance passée ou du jour", () => {
    expect(validateGoal({ date: "2026-10-09", weightKg: 75.8 }, entries, [], today)).toMatch(/futur/);
  });

  it("refuse un deuxième objectif le même jour", () => {
    const goals = [newGoal("2026-10-20", 74)];
    expect(validateGoal({ date: "2026-10-20", weightKg: 74.5 }, entries, goals, today)).toMatch(/un seul objectif/i);
  });

  it("accepte un rythme réaliste depuis la dernière pesée", () => {
    // 11 jours : au plus 1,57 kg.
    expect(validateGoal({ date: "2026-10-20", weightKg: 74.5 }, entries, [], today)).toBeNull();
    expect(validateGoal({ date: "2026-10-20", weightKg: 74.3 }, entries, [], today)).toMatch(/au plus 1,6 kg/);
  });

  it("refuse un objectif trop rapide", () => {
    expect(validateGoal({ date: "2026-10-11", weightKg: 74 }, entries, [], today)).toMatch(/trop rapide/);
  });

  it("enchaîne depuis l'objectif précédent", () => {
    const goals = [newGoal("2026-10-16", 75.2)];
    // 7 jours après l'objectif à 75,2 kg : au plus 1 kg.
    expect(validateGoal({ date: "2026-10-23", weightKg: 74.4 }, entries, goals, today)).toBeNull();
    expect(validateGoal({ date: "2026-10-23", weightKg: 74 }, entries, goals, today)).toMatch(/votre objectif/);
  });

  it("vérifie qu'un objectif inséré laisse l'objectif suivant atteignable", () => {
    const goals = [newGoal("2026-10-30", 73)];
    // Le 16 à 75 kg, il resterait 2 kg en 14 jours : possible. À 75,5 kg : 2,5 kg en 14 jours, impossible.
    expect(validateGoal({ date: "2026-10-16", weightKg: 75 }, entries, goals, today)).toBeNull();
    expect(validateGoal({ date: "2026-10-16", weightKg: 75.5 }, entries, goals, today)).toMatch(/irréaliste/);
  });
});

describe("realisticRange", () => {
  it("donne la fourchette atteignable depuis le dernier point connu", () => {
    const entries = [{ id: "p", date: "2026-10-09", weightKg: 76, heightCm: 175 }];
    // 7 jours : ± 1 kg.
    expect(realisticRange("2026-10-16", entries, [])).toMatchObject({ min: 75, max: 77 });
    expect(realisticRange("2026-10-16", [], [])).toBeNull();
  });
});

describe("isImcData : données relues du téléphone", () => {
  it("accepte des données valides", () => {
    expect(isImcData({ entries: [], goals: [] })).toBe(true);
    expect(
      isImcData({
        entries: [{ id: "a", date: "2026-01-01", weightKg: 70, heightCm: 175 }],
        goals: [{ id: "g", date: "2026-02-01", weightKg: 68 }],
      }),
    ).toBe(true);
  });

  it("refuse des données abîmées ou incomplètes", () => {
    expect(isImcData({ entries: [{ date: "2026-01-01" }], goals: [] })).toBe(false);
    expect(isImcData({ entries: "x", goals: [] })).toBe(false);
    expect(isImcData({ entries: [] })).toBe(false);
    expect(isImcData(null)).toBe(false);
  });
});
