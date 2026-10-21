import { ArrowDownTrayIcon, ArrowUpOnSquareIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { promptInstall, useInstallMode } from "./install";
import { Sheet } from "./ui/Sheet";

export function InstallButton() {
  const mode = useInstallMode();
  const [iosHelp, setIosHelp] = useState(false);
  if (!mode) return null;

  const onClick = () => (mode === "prompt" ? void promptInstall() : setIosHelp(true));

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
        <Sheet open={iosHelp} onClose={() => setIosHelp(false)} title="Installer sur votre iPhone">
          <ol className="flex flex-col gap-4 text-sm">
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
          <p className="text-xs text-muted-foreground">
            L'application s'ouvre alors comme une app, même sans connexion, et vos données restent sur votre téléphone.
          </p>
        </Sheet>
      )}
    </>
  );
}
