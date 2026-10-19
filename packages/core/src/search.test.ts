import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { isOrgan, normalize, organsInUse, searchTools } from "./search";

const ids = (tools: { id: string }[]) => tools.map((t) => t.id);

describe("recherche dans le catalogue", () => {
  it("ignore accents et majuscules", () => {
    expect(normalize("  Glycémie ")).toBe("glycemie");
    expect(ids(searchTools(CATALOG, "GLYCEMIE"))).toContain("diabete");
  });

  it("cherche aussi dans les organes et les conditions", () => {
    expect(ids(searchTools(CATALOG, "reins"))).toEqual(expect.arrayContaining(["dfg", "analyse-bio"]));
    expect(ids(searchTools(CATALOG, "diabète"))).toEqual(expect.arrayContaining(["imc", "dn4", "hba1c"]));
  });

  it("exige tous les mots, dans n'importe quel ordre", () => {
    expect(ids(searchTools(CATALOG, "neuropathiques score"))).toEqual(["dn4"]);
  });

  it("filtre par organe, seul ou avec du texte", () => {
    expect(searchTools(CATALOG, "", "andro").map((t) => t.id)).toEqual(["iief5"]);
    expect(ids(searchTools(CATALOG, "score", "metabolisme"))).toEqual(["mna", "nrs"]);
  });

  it("renvoie tout le catalogue sans critère", () => {
    expect(searchTools(CATALOG, "  ")).toHaveLength(CATALOG.length);
  });

  it("liste les organes utilisés et reconnaît un organe valide", () => {
    expect(organsInUse(CATALOG)).toHaveLength(11);
    expect(isOrgan("rein")).toBe(true);
    expect(isOrgan("foie")).toBe(false);
  });
});
