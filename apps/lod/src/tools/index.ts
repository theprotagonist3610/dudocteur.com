/*
  Interfaces des outils, par identifiant du catalogue (@lod/core).
  Un outil sans interface ici affiche la page « Bientôt disponible ».
  Ajouter un outil : écrire son composant dans tools/<id>/, l'enregistrer ici
  en lazy (chargé seulement à l'ouverture de sa page), puis passer son statut
  à "disponible" dans le catalogue.
*/
import type { ComponentType, LazyExoticComponent } from "react";

export const TOOL_COMPONENTS: Partial<Record<string, LazyExoticComponent<ComponentType>>> = {};
