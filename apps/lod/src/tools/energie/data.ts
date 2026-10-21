// Données de l'outil Besoins énergétiques : seule l'activité au travail lui est propre.
// Poids et taille viennent des pesées de l'IMC ; sexe et masse maigre, de l'outil Masse maigre.
import { energie } from "@lod/core";
import { useToolData } from "../../lib/storage";

const { ENERGIE_TOOL_ID, EMPTY_ENERGIE_DATA, isEnergieData } = energie;

export function useEnergieData() {
  const { data, update, saved } = useToolData(ENERGIE_TOOL_ID, isEnergieData, EMPTY_ENERGIE_DATA);
  return {
    activity: data.activity,
    saved,
    // Seuls le métier et les jours sont gardés : les minutes de sport d'une ancienne
    // version, encore présentes sur le téléphone, disparaissent au premier changement.
    setActivity: (change: Partial<energie.Activity>) =>
      update((d) => {
        const { job, workDaysPerWeek } = { ...d.activity, ...change };
        return { ...d, activity: { job, workDaysPerWeek } };
      }),
  };
}
