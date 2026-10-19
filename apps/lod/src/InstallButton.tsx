import { ArrowDownTrayIcon, ArrowUpOnSquareIcon, PlusCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRef } from "react";
import { promptInstall, useInstallMode } from "./install";

export function InstallButton() {
  const mode = useInstallMode();
  const dialog = useRef<HTMLDialogElement>(null);
  if (!mode) return null;

  const onClick = () => (mode === "prompt" ? void promptInstall() : dialog.current?.showModal());

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground active:bg-primary-hover"
      >
        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
        Installer
      </button>

      {mode === "ios" && (
        <dialog
          ref={dialog}
          aria-labelledby="install-title"
          // Feuille ancrée en bas de l'écran, à portée de pouce.
          className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-foreground backdrop:bg-black/40 sm:m-auto sm:max-w-sm sm:rounded-3xl"
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="install-title" className="text-lg font-semibold">
              Installer sur votre iPhone
            </h2>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => dialog.current?.close()}
              className="-mt-2 -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <ol className="mt-4 flex flex-col gap-4 text-sm">
            <li className="flex items-center gap-3">
              <ArrowUpOnSquareIcon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Touchez <strong>Partager</strong> dans la barre de Safari.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <PlusCircleIcon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Choisissez <strong>Sur l'écran d'accueil</strong>, puis <strong>Ajouter</strong>.
              </span>
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            L'application s'ouvre alors comme une app, même sans connexion, et vos données restent sur votre téléphone.
          </p>
        </dialog>
      )}
    </>
  );
}
