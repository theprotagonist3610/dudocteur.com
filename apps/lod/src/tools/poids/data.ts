// Données de l'outil Masse maigre, enregistrées sur l'appareil (voir lib/storage.ts).
// Le mode estimatif utilise les pesées de l'IMC (lues et ajoutées via useImcData).
import { poids } from "@lod/core";
import { useToolData } from "../../lib/storage";

const { POIDS_TOOL_ID, EMPTY_POIDS_DATA, isPoidsData, removeById, replaceMeasurementOnDate } = poids;

export function usePoidsData() {
  const { data, update, saved } = useToolData(POIDS_TOOL_ID, isPoidsData, EMPTY_POIDS_DATA);
  return {
    ...data,
    saved,
    setSex: (sex: poids.BiologicalSex) => update((d) => ({ ...d, sex })),
    setMode: (mode: poids.Mode) => update((d) => ({ ...d, mode })),
    // Un jour = une mesure : une saisie à une date déjà occupée remplace l'existante.
    saveMeasurement: (m: poids.MeasurementEntry) =>
      update((d) => ({ ...d, measurements: replaceMeasurementOnDate(d.measurements, m) })),
    removeMeasurement: (id: string) => update((d) => ({ ...d, measurements: removeById(d.measurements, id) })),
  };
}
