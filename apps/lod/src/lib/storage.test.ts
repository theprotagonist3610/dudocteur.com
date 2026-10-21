import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useToolData } from "./storage";

interface Counter {
  count: number;
}
const isCounter = (v: unknown): v is Counter =>
  typeof v === "object" && v !== null && typeof (v as Counter).count === "number";
const EMPTY: Counter = { count: 0 };

// Chaque test utilise son propre outil : le cache du module ne fuit pas d'un test à l'autre.
let n = 0;
const freshTool = () => `test-${++n}`;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("useToolData", () => {
  it("part des données vides puis enregistre sur l'appareil, dans une enveloppe versionnée", () => {
    const tool = freshTool();
    const { result } = renderHook(() => useToolData(tool, isCounter, EMPTY));
    expect(result.current.data).toEqual({ count: 0 });

    act(() => result.current.update((c) => ({ count: c.count + 1 })));
    expect(result.current.data).toEqual({ count: 1 });
    expect(result.current.saved).toBe(true);
    expect(JSON.parse(localStorage.getItem(`lod:${tool}`)!)).toEqual({ v: 1, data: { count: 1 } });
  });

  it("relit les données déjà enregistrées", () => {
    const tool = freshTool();
    localStorage.setItem(`lod:${tool}`, JSON.stringify({ v: 1, data: { count: 7 } }));
    const { result } = renderHook(() => useToolData(tool, isCounter, EMPTY));
    expect(result.current.data).toEqual({ count: 7 });
  });

  it("ignore une donnée abîmée, invalide ou d'une autre version, sans l'effacer", () => {
    for (const raw of ["{pas du json", JSON.stringify({ v: 1, data: { count: "x" } }), JSON.stringify({ v: 2, data: { count: 3 } })]) {
      const tool = freshTool();
      localStorage.setItem(`lod:${tool}`, raw);
      const { result } = renderHook(() => useToolData(tool, isCounter, EMPTY));
      expect(result.current.data).toEqual({ count: 0 });
      expect(localStorage.getItem(`lod:${tool}`)).toBe(raw);
    }
  });

  it("enchaîne les modifications à partir des données les plus récentes", () => {
    const tool = freshTool();
    const { result } = renderHook(() => useToolData(tool, isCounter, EMPTY));
    act(() => {
      result.current.update((c) => ({ count: c.count + 1 }));
      result.current.update((c) => ({ count: c.count + 1 }));
    });
    expect(result.current.data).toEqual({ count: 2 });
  });

  it("si l'écriture échoue : garde la valeur en mémoire et le signale", () => {
    const tool = freshTool();
    const { result } = renderHook(() => useToolData(tool, isCounter, EMPTY));
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("plein", "QuotaExceededError");
    });
    act(() => result.current.update(() => ({ count: 5 })));
    expect(result.current.data).toEqual({ count: 5 });
    expect(result.current.saved).toBe(false);
  });

  it("partage les données entre deux composants du même outil", () => {
    const tool = freshTool();
    const a = renderHook(() => useToolData(tool, isCounter, EMPTY));
    const b = renderHook(() => useToolData(tool, isCounter, EMPTY));
    act(() => a.result.current.update(() => ({ count: 9 })));
    expect(b.result.current.data).toEqual({ count: 9 });
  });
});
