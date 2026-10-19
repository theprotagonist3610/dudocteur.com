/*
  Installation de la PWA sur l'écran d'accueil.
  - Android / Chrome / Edge : le navigateur émet beforeinstallprompt, qu'on garde
    pour afficher sa boîte d'installation au clic sur « Installer ».
  - iPhone / iPad (Safari) : pas d'API, on affiche les étapes à suivre.
  Installée, l'app est aussi à l'abri du nettoyage automatique des données par Safari.

  L'événement peut arriver avant le premier rendu React : on l'écoute dès le
  chargement du module (importé par main.tsx).
*/
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault(); // on garde la main sur le moment où on la propose
  deferred = event as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener("appinstalled", () => {
  deferred = null;
  notify();
});

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS se présente comme un Mac : on le reconnaît à son écran tactile.
const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

export type InstallMode = "prompt" | "ios" | null;

function getMode(): InstallMode {
  if (isStandalone()) return null;
  if (deferred) return "prompt";
  return isIos() ? "ios" : null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// "prompt" : boîte d'installation disponible ; "ios" : afficher les étapes ; null : rien à proposer.
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, getMode);
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return;
  const event = deferred;
  deferred = null; // l'événement ne sert qu'une fois
  notify();
  await event.prompt();
}
