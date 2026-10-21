/*
  Interfaces des outils, par identifiant du catalogue (@lod/core).
  Un outil sans interface ici affiche la page « Bientôt disponible ».
  Ajouter un outil : écrire son composant dans tools/<id>/, l'enregistrer ici
  en lazy (chargé seulement à l'ouverture de sa page), puis passer son statut
  à "disponible" dans le catalogue.
*/
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export const TOOL_COMPONENTS: Partial<Record<string, LazyExoticComponent<ComponentType>>> = {
  imc: lazy(() => import("./imc/ImcTool")),
  poids: lazy(() => import("./poids/PoidsTool")),
  "besoins-energetiques": lazy(() => import("./energie/EnergieTool")),
  "programme-minceur": lazy(() => import("./minceur/MinceurTool")),
};
