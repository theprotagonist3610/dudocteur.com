import { describe, expect, it } from "vitest";
import type { ImcEntry } from "./imc";
import {
  boerLeanMassKg,
  bmrStatus,
  buildLeanMassRows,
  buildMeasurementRows,
  dayEntryEffect,
  estimateLeanMassKg,
  fatFreeMassIndex,
  fatLevel,
  fatMass,
  formulaForBmi,
  isPoidsData,
  jamesLeanMassKg,
  katchMcArdleKcal,
  kpiStatuses,
  leanMassComment,
  leanMassLevel,
  navyFatPercent,
  referenceBmrKcal,
  replaceMeasurementOnDate,
  validateMeasurementInput,
  type MeasurementEntry,
} from "./poids";

// Pesées et mensurations de référence (reprises des tests du prototype).
const ENTRIES: ImcEntry[] = [
  { id: "1", date: "2026-09-09", weightKg: 79.2, heightCm: 175 },
  { id: "2", date: "2026-09-23", weightKg: 78, heightCm: 175 },
  { id: "3", date: "2026-10-07", weightKg: 76.5, heightCm: 175 },
];

// Mensurations aux dates de pesées de l'IMC (le poids et la taille viennent des pesées).
const MEASUREMENTS: MeasurementEntry[] = [
  { id: "m1", date: "2026-09-09", neckCm: 38.5, waistCm: 92, hipCm: 101 },
  { id: "m2", date: "2026-10-07", neckCm: 38, waistCm: 88.5, hipCm: 99 },
];

describe("formule de James", () => {
  it("distingue homme et femme", () => {
    expect(jamesLeanMassKg(76.5, 175, "homme")).toBe(59.7);
    expect(jamesLeanMassKg(76.5, 175, "femme")).toBe(53.6);
  });
});

describe("formule de Boer", () => {
  it("distingue homme et femme", () => {
    expect(boerLeanMassKg(76.5, 175, "homme")).toBe(58.7);
    expect(boerLeanMassKg(76.5, 175, "femme")).toBe(53.8);
  });
});

describe("indice de masse maigre", () => {
  it("divise la masse maigre par la taille au carré", () => {
    expect(fatFreeMassIndex(58.7, 175)).toBe(19.2);
  });

  it("applique les seuils ESPEN de masse maigre basse", () => {
    expect(leanMassLevel(16.9, "homme")).toBe("basse");
    expect(leanMassLevel(17, "homme")).toBe("normale");
    expect(leanMassLevel(14.9, "femme")).toBe("basse");
    expect(leanMassLevel(15, "femme")).toBe("normale");
  });
});

describe("buildLeanMassRows (pesées de l'IMC)", () => {
  it("trie par date et calcule les estimations de chaque pesée", () => {
    const rows = buildLeanMassRows([...ENTRIES].reverse(), "homme");
    expect(rows.map((r) => r.id)).toEqual(["1", "2", "3"]);
    // IMC 25 : formule de James ; IMM = 59,7 / 1,75².
    expect(rows.at(-1)).toMatchObject({
      date: "2026-10-07",
      bmi: 25,
      formula: "james",
      leanMassKg: 59.7,
      fatMassKg: 16.8,
      fatPercent: 22,
      fatLevel: "elevee",
      bmrKcal: 1660,
      referenceBmrKcal: 1799,
      ffmi: 19.5,
      level: "normale",
    });
  });

  it("commente la dernière pesée", () => {
    const latest = buildLeanMassRows(ENTRIES, "homme").at(-1)!;
    expect(leanMassComment(latest, "homme")).toMatch(/dans les valeurs habituelles/);
  });
});

describe("choix de la formule selon l'IMC", () => {
  it("James sous 30, Boer à partir de 30", () => {
    expect(formulaForBmi(29.9)).toBe("james");
    expect(formulaForBmi(30)).toBe("boer");
  });

  it("retient Boer en cas d'obésité, où James sous-estime la masse maigre", () => {
    // 120 kg pour 1,75 m : IMC 39,2.
    const estimate = estimateLeanMassKg(120, 175, "homme");
    expect(estimate).toMatchObject({ bmi: 39.2, formula: "boer", leanMassKg: 76.4 });
    expect(jamesLeanMassKg(120, 175, "homme")).toBeLessThan(estimate.leanMassKg);
  });
});

describe("fatMass", () => {
  it("déduit la masse grasse du poids et de la masse maigre", () => {
    expect(fatMass(76.5, 59.7)).toEqual({ fatMassKg: 16.8, fatPercent: 22 });
  });
});

describe("appréciation de la masse grasse", () => {
  it("homme : idéale entre 12 et 15 %", () => {
    expect(fatLevel(11.9, "homme")).toBe("basse");
    expect(fatLevel(12, "homme")).toBe("ideale");
    expect(fatLevel(15, "homme")).toBe("ideale");
    expect(fatLevel(15.1, "homme")).toBe("elevee");
  });

  it("femme : idéale entre 20 et 24 %", () => {
    expect(fatLevel(19.9, "femme")).toBe("basse");
    expect(fatLevel(22, "femme")).toBe("ideale");
    expect(fatLevel(24.1, "femme")).toBe("elevee");
  });
});

describe("métabolisme de base (Katch-McArdle)", () => {
  it("vaut 370 + 21,6 × masse maigre", () => {
    expect(katchMcArdleKcal(59.7)).toBe(1660);
  });

  it("référence : même poids avec une masse grasse idéale (milieu de la fourchette)", () => {
    expect(referenceBmrKcal(76.5, "homme")).toBe(1799);
    expect(referenceBmrKcal(76.5, "femme")).toBe(1659);
  });
});

describe("code couleur des indicateurs", () => {
  it("métabolisme de base : vert jusqu'à 5 % sous la normale, orange jusqu'à 10 %, rouge au-delà", () => {
    expect(bmrStatus(1800, 1800)).toEqual({ tone: "success", label: "Normal" });
    expect(bmrStatus(1720, 1800)).toEqual({ tone: "success", label: "Proche de la normale" });
    expect(bmrStatus(1660, 1799)).toEqual({ tone: "warning", label: "Un peu bas" });
    expect(bmrStatus(1600, 1800)).toEqual({ tone: "danger", label: "Bas" });
  });

  it("donne le statut des 4 indicateurs de la dernière pesée", () => {
    const statuses = kpiStatuses(buildLeanMassRows(ENTRIES, "homme").at(-1)!);
    expect(statuses.leanMass.tone).toBe("success");
    expect(statuses.fat).toEqual({ tone: "danger", label: "Élevée" });
    expect(statuses.ffmi.tone).toBe("success");
    expect(statuses.bmr.tone).toBe("warning");
  });
});

describe("méthode US Navy (mode manuel)", () => {
  it("homme : à partir du cou, du tour de taille et de la taille", () => {
    expect(navyFatPercent({ heightCm: 175, neckCm: 38, waistCm: 90, hipCm: null }, "homme")).toBe(20.7);
  });

  it("femme : le tour de hanches est nécessaire", () => {
    expect(navyFatPercent({ heightCm: 175, neckCm: 38, waistCm: 90, hipCm: 100 }, "femme")).toBe(31.6);
    expect(navyFatPercent({ heightCm: 175, neckCm: 38, waistCm: 90, hipCm: null }, "femme")).toBeNull();
  });

  it("refuse des mesures incohérentes", () => {
    expect(navyFatPercent({ heightCm: 175, neckCm: 40, waistCm: 38, hipCm: null }, "homme")).toBeNull();
  });

  it("déduit masse maigre, masse grasse et métabolisme des mensurations et de la pesée du jour", () => {
    const { rows, unusable } = buildMeasurementRows(MEASUREMENTS, ENTRIES, "homme");
    expect(unusable).toHaveLength(0);
    const latest = rows.at(-1)!;
    expect(latest).toMatchObject({ formula: "navy", date: "2026-10-07", weightKg: 76.5, heightCm: 175 });
    expect(latest.leanMassKg + latest.fatMassKg).toBeCloseTo(latest.weightKg, 1);
  });

  it("suit la pesée de l'IMC : la modifier change le calcul des mensurations du jour", () => {
    const corrected = ENTRIES.map((e) => (e.date === "2026-10-07" ? { ...e, weightKg: 80 } : e));
    const latest = buildMeasurementRows(MEASUREMENTS, corrected, "homme").rows.at(-1)!;
    expect(latest.weightKg).toBe(80);
    expect(latest.leanMassKg + latest.fatMassKg).toBeCloseTo(80, 1);
  });

  it("met de côté les mensurations sans pesée le même jour", () => {
    const { rows, unusable } = buildMeasurementRows(MEASUREMENTS, ENTRIES.slice(0, 2), "homme");
    expect(rows.map((r) => r.date)).toEqual(["2026-09-09"]);
    expect(unusable).toEqual([{ measurement: MEASUREMENTS[1], reason: "pesee-manquante" }]);
  });

  it("met de côté les mesures incohérentes (hanches manquantes pour une femme)", () => {
    const { rows, unusable } = buildMeasurementRows([{ ...MEASUREMENTS[0]!, hipCm: null }, MEASUREMENTS[1]!], ENTRIES, "femme");
    expect(rows).toHaveLength(1);
    expect(unusable).toEqual([{ measurement: { ...MEASUREMENTS[0]!, hipCm: null }, reason: "incoherentes" }]);
  });

  it("annonce l'effet d'une saisie sur la pesée IMC du jour", () => {
    expect(dayEntryEffect(ENTRIES, "2026-10-20", 76, 175).effect).toBe("ajoutee");
    expect(dayEntryEffect(ENTRIES, "2026-10-07", 76.5, 175).effect).toBe("identique");
    const replaced = dayEntryEffect(ENTRIES, "2026-10-07", 77, 175);
    expect(replaced).toMatchObject({ effect: "remplacee", existing: { weightKg: 76.5 } });
  });

  it("une mesure par jour : la nouvelle remplace celle du même jour", () => {
    const next = replaceMeasurementOnDate(MEASUREMENTS, { ...MEASUREMENTS[1]!, id: "m3", waistCm: 88 });
    expect(next.map((m) => m.id).sort()).toEqual(["m1", "m3"]);
  });
});

describe("saisie des mensurations", () => {
  const today = "2026-10-20";
  const input = { date: today, weightKg: "76,5", heightCm: "175", neckCm: "38", waistCm: "88,5", hipCm: "" };

  it("homme : accepte la virgule, ignore le tour de hanches, sépare mensurations et pesée", () => {
    const result = validateMeasurementInput(input, "homme", today);
    expect(result.measurement).toEqual({ date: today, neckCm: 38, waistCm: 88.5, hipCm: null });
    expect(result.entry).toEqual({ date: today, weightKg: 76.5, heightCm: 175 });
  });

  it("femme : le tour de hanches est obligatoire", () => {
    expect(validateMeasurementInput(input, "femme", today).errors.hipCm).toBeDefined();
    expect(validateMeasurementInput({ ...input, hipCm: "99" }, "femme", today).measurement?.hipCm).toBe(99);
  });

  it("signale chaque champ hors plage, et la date future", () => {
    const { errors } = validateMeasurementInput(
      { date: "2026-10-21", weightKg: "5", heightCm: "", neckCm: "10", waistCm: "300", hipCm: "" },
      "homme",
      today,
    );
    expect(Object.keys(errors).sort()).toEqual(["date", "heightCm", "neckCm", "waistCm", "weightKg"]);
  });

  it("refuse des mesures dans les plages mais incohérentes entre elles", () => {
    expect(validateMeasurementInput({ ...input, neckCm: "45", waistCm: "44" }, "homme", today).errors.form).toMatch(
      /ne permettent pas le calcul/,
    );
  });
});

describe("isPoidsData : données relues du téléphone", () => {
  it("accepte des données valides, sexe non renseigné compris", () => {
    expect(isPoidsData({ sex: null, mode: "estimatif", measurements: [] })).toBe(true);
    expect(isPoidsData({ sex: "femme", mode: "manuel", measurements: MEASUREMENTS })).toBe(true);
  });

  it("refuse des données abîmées", () => {
    expect(isPoidsData({ sex: "autre", mode: "estimatif", measurements: [] })).toBe(false);
    expect(isPoidsData({ sex: null, mode: "x", measurements: [] })).toBe(false);
    expect(isPoidsData({ sex: null, mode: "manuel", measurements: [{ id: "a" }] })).toBe(false);
  });
});
