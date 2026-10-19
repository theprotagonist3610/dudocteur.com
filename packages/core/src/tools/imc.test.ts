import { describe, expect, it } from "vitest";
import { bmiCategory, computeBmi, idealWeightKg } from "./imc";

describe("IMC", () => {
  it("calcule l'IMC arrondi à une décimale", () => {
    expect(computeBmi(76.5, 175)).toBe(25);
    expect(computeBmi(70, 180)).toBe(21.6);
  });

  it("classe selon les seuils OMS", () => {
    expect(bmiCategory(18.4)).toBe("Insuffisance pondérale");
    expect(bmiCategory(18.5)).toBe("Corpulence normale");
    expect(bmiCategory(25)).toBe("Surpoids");
    expect(bmiCategory(30)).toBe("Obésité modérée");
    expect(bmiCategory(35)).toBe("Obésité sévère");
    expect(bmiCategory(40)).toBe("Obésité morbide");
  });

  it("donne le poids idéal pour un IMC de 22", () => {
    expect(idealWeightKg(175)).toBe(67.4);
  });
});
