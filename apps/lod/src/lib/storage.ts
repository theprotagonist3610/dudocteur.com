/*
  Enregistrement des données d'un outil sur l'appareil (localStorage).
  Rien ne quitte le téléphone : c'est le seul stockage de la phase 1.

  - Une clé par outil : "lod:<id de l'outil>".
  - Enveloppe versionnée { v, data } : un changement de format pourra être migré.
  - Chaque lecture est vérifiée par l'outil (isValid) : une donnée abîmée ou d'un
    ancien format est ignorée plutôt que de faire planter la page.
  - Si le stockage est indisponible (navigation privée stricte, quota plein),
    les données vivent en mémoire le temps de la session et l'outil le signale.
*/
import { useCallback, useSyncExternalStore } from "react";

const VERSION = 1;
const keyOf = (toolId: string) => `lod:${toolId}`;

interface Envelope {
  v: number;
  data: unknown;
}

// Dernière valeur connue par clé : useSyncExternalStore exige une référence stable entre deux lectures.
const cache = new Map<string, { raw: string | null; value: unknown }>();
const listeners = new Map<string, Set<() => void>>();
// Clés dont la dernière écriture a échoué (données gardées en mémoire seulement).
const unsaved = new Set<string>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function read<T>(key: string, isValid: (v: unknown) => v is T, empty: T): T {
  const raw = readRaw(key);
  const cached = cache.get(key);
  if (cached && (cached.raw === raw || unsaved.has(key))) return cached.value as T;

  let value: T = empty;
  if (raw) {
    try {
      const envelope = JSON.parse(raw) as Envelope;
      if (envelope?.v === VERSION && isValid(envelope.data)) value = envelope.data;
    } catch {
      // Donnée illisible : on repart de vide sans l'effacer (elle reste récupérable).
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, value: unknown) {
  const raw = JSON.stringify({ v: VERSION, data: value } satisfies Envelope);
  cache.set(key, { raw, value });
  try {
    localStorage.setItem(key, raw);
    unsaved.delete(key);
    requestPersistence();
  } catch {
    unsaved.add(key);
  }
  notify(key);
}

// Changement fait dans un autre onglet : on relit.
window.addEventListener("storage", (event) => {
  if (event.key?.startsWith("lod:")) notify(event.key);
});

/*
  Demande au navigateur de ne pas effacer les données de l'app quand l'espace
  manque (Chrome/Android l'accorde souvent pour une app installée ou très utilisée).
  Une seule demande par session, après le premier enregistrement.
*/
let persistenceRequested = false;
function requestPersistence() {
  if (persistenceRequested) return;
  persistenceRequested = true;
  void navigator.storage?.persist?.().catch(() => {});
}

export interface ToolData<T> {
  data: T;
  // Applique une modification à partir des données les plus récentes.
  update: (change: (current: T) => T) => void;
  // false si la dernière écriture a échoué : les données ne survivront pas à la fermeture.
  saved: boolean;
}

export function useToolData<T>(toolId: string, isValid: (v: unknown) => v is T, empty: T): ToolData<T> {
  const key = keyOf(toolId);

  const subscribe = useCallback(
    (listener: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      return () => set.delete(listener);
    },
    [key],
  );

  const data = useSyncExternalStore(subscribe, () => read(key, isValid, empty));
  const saved = useSyncExternalStore(subscribe, () => !unsaved.has(key));

  const update = useCallback(
    (change: (current: T) => T) => write(key, change(read(key, isValid, empty))),
    [key, isValid, empty],
  );

  return { data, update, saved };
}
