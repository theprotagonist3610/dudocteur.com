import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dark, light, type Palette } from "./index";

const css = readFileSync(new URL("../theme.css", import.meta.url), "utf8");

// Contenu du premier bloc CSS ouvert par `selector`.
function block(selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Bloc introuvable : ${selector}`);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}

function expectBlockMatches(body: string, palette: Palette) {
  for (const [token, value] of Object.entries(palette)) {
    expect(body, `--${token}`).toContain(`--${token}: ${value};`);
  }
}

describe("theme.css reprend les jetons de src/index.ts", () => {
  it("thème clair", () => expectBlockMatches(block(":root {"), light));
  it("thème sombre (système)", () => expectBlockMatches(block(':root:not([data-theme="light"])'), dark));
  it("thème sombre (choix explicite)", () => expectBlockMatches(block(':root[data-theme="dark"]'), dark));
});
