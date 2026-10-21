// Données du Programme minceur : le programme en cours et les habitudes cochées.
// Poids, sexe, masse maigre et besoins viennent des outils IMC, Masse maigre et Besoins énergétiques.
import { minceur } from "@lod/core";
import { useToolData } from "../../lib/storage";

const { MINCEUR_TOOL_ID, EMPTY_MINCEUR_DATA, isMinceurData } = minceur;

export function useMinceurData() {
  const { data, update, saved } = useToolData(MINCEUR_TOOL_ID, isMinceurData, EMPTY_MINCEUR_DATA);
  return {
    ...data,
    saved,
    setPlan: (plan: minceur.Plan | null) => update((d) => ({ ...d, plan })),
    toggleHabit: (week: string, habit: minceur.Habit) =>
      update((d) => {
        const done = d.habits[week] ?? [];
        const next = done.includes(habit) ? done.filter((h) => h !== habit) : [...done, habit];
        return { ...d, habits: { ...d.habits, [week]: next } };
      }),
  };
}
