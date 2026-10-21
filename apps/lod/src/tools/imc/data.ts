// Données de l'IMC, enregistrées sur l'appareil (voir lib/storage.ts).
import { imc } from "@lod/core";
import { useMemo } from "react";
import { useToolData } from "../../lib/storage";

const { IMC_TOOL_ID, EMPTY_IMC_DATA, isImcData, buildRows, sortByDate, replaceEntryOnDate, removeById } = imc;

export function useImcData() {
  const { data, update, saved } = useToolData(IMC_TOOL_ID, isImcData, EMPTY_IMC_DATA);
  const rows = useMemo(() => buildRows(data.entries), [data.entries]);
  const goals = useMemo(() => sortByDate(data.goals), [data.goals]);

  return {
    entries: data.entries,
    rows,
    goals,
    saved,
    // Un jour = une mesure : une prise à une date déjà occupée remplace l'existante
    // (l'interface demande d'abord laquelle garder).
    saveEntry: (entry: imc.ImcEntry) => update((d) => ({ ...d, entries: replaceEntryOnDate(d.entries, entry) })),
    removeEntry: (id: string) => update((d) => ({ ...d, entries: removeById(d.entries, id) })),
    addGoal: (goal: imc.ImcGoal) => update((d) => ({ ...d, goals: [...d.goals, goal] })),
    removeGoal: (id: string) => update((d) => ({ ...d, goals: removeById(d.goals, id) })),
  };
}
