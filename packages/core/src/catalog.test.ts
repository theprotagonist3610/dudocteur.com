import { describe, expect, it } from "vitest";
import { CATALOG, getToolMeta } from "./catalog";

describe("catalogue", () => {
  it("contient les 27 outils, chacun avec un identifiant unique", () => {
    expect(CATALOG).toHaveLength(27);
    expect(new Set(CATALOG.map((t) => t.id)).size).toBe(CATALOG.length);
  });

  it("retrouve un outil par son identifiant", () => {
    expect(getToolMeta("imc")?.name).toBe("IMC");
    expect(getToolMeta("inconnu")).toBeUndefined();
  });
});
