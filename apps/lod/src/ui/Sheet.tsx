import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /*
    Pour un formulaire : panneau haut (85 % de l'écran), champs en haut. Sur iPhone,
    le clavier recouvre le bas de l'écran sans le redimensionner : les champs
    restent ainsi visibles au-dessus du clavier.
  */
  tall?: boolean;
}

/*
  Panneau qui monte du bas de l'écran (à portée de pouce) sur téléphone,
  fenêtre centrée sur grand écran. Basé sur <dialog> : focus piégé, touche
  Échap et retour d'accessibilité fournis par le navigateur. Le contenu n'est
  rendu qu'ouvert, ce qui remet les formulaires à zéro à chaque ouverture.
*/
export function Sheet({ open, onClose, title, children, tall = false }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      // Toucher le fond assombri ferme le panneau.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`m-0 mt-auto w-full max-w-none overflow-y-auto overscroll-contain rounded-t-3xl bg-surface text-foreground backdrop:bg-black/40 sm:m-auto sm:max-h-[85dvh] sm:max-w-md sm:rounded-3xl ${
        tall ? "h-[85dvh] sm:h-auto" : "max-h-[85dvh]"
      }`}
    >
      {open && (
        <div className="flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-4">
            <h2 className="pt-2 text-lg font-semibold">{title}</h2>
            <button
              type="button"
              aria-label="Fermer"
              onClick={onClose}
              className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-muted md:hover:bg-muted"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
