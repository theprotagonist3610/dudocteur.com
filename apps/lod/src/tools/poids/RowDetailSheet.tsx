import { TrashIcon } from "@heroicons/react/24/outline";
import { formatDecimal, poids } from "@lod/core";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../../ui/forms";
import { Sheet } from "../../ui/Sheet";
import { FAT_LEVEL_TEXT } from "./tones";

const { FAT_LEVEL_LABELS, FORMULA_LABELS, formatDate, formatInteger } = poids;

interface RowDetailSheetProps {
  row: poids.LeanMassRow | null;
  mode: poids.Mode;
  onClose: () => void;
  // Absent en mode estimatif : les pesées se gèrent dans l'outil IMC.
  onRemove?: (id: string) => void;
}

export function RowDetailSheet({ row, mode, onClose, onRemove }: RowDetailSheetProps) {
  return (
    <Sheet open={row !== null} onClose={onClose} title={row ? `Le ${formatDate(row.date)}` : "Détail"}>
      {row && <RowDetail row={row} mode={mode} onClose={onClose} onRemove={onRemove} />}
    </Sheet>
  );
}

function RowDetail({ row, mode, onClose, onRemove }: { row: poids.LeanMassRow } & Omit<RowDetailSheetProps, "row">) {
  const [confirming, setConfirming] = useState(false);
  const lines: [string, string, string?][] = [
    ["Poids", `${formatDecimal(row.weightKg)} kg`],
    ["Taille", `${formatDecimal(row.heightCm)} cm`],
    ["IMC", formatDecimal(row.bmi)],
    ["Masse maigre", `${formatDecimal(row.leanMassKg)} kg`],
    [
      "Masse grasse",
      `${formatDecimal(row.fatMassKg)} kg · ${formatDecimal(row.fatPercent)} % (${FAT_LEVEL_LABELS[row.fatLevel].toLowerCase()})`,
      FAT_LEVEL_TEXT[row.fatLevel],
    ],
    ["Indice de masse maigre", formatDecimal(row.ffmi), row.level === "basse" ? "text-destructive" : undefined],
    ["Métabolisme de base", `${formatInteger(row.bmrKcal)} kcal/j`],
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-border rounded-2xl border border-border">
        {lines.map(([label, value, tone]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={`text-right font-semibold tabular-nums ${tone ?? "text-foreground"}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">Calcul : formule de {FORMULA_LABELS[row.formula]}.</p>

      {mode === "estimatif" ? (
        <Link
          to="/imc"
          className="inline-flex h-12 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground active:bg-muted"
        >
          Gérer mes pesées dans l'outil IMC
        </Link>
      ) : onRemove && confirming ? (
        <div role="alertdialog" aria-labelledby="poids-confirm" className="flex flex-col gap-3">
          <p id="poids-confirm" className="text-sm font-semibold text-foreground">
            Supprimer définitivement ces mensurations ?
          </p>
          <p className="-mt-2 text-sm text-muted-foreground">La pesée du jour reste dans l'outil IMC.</p>
          <Button
            variant="danger"
            onClick={() => {
              onRemove(row.id);
              onClose();
            }}
          >
            Supprimer
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        onRemove && (
          <Button variant="secondary" className="text-destructive" onClick={() => setConfirming(true)}>
            <TrashIcon className="h-5 w-5" aria-hidden="true" />
            Supprimer ces mensurations
          </Button>
        )
      )}
    </div>
  );
}
