import { TrashIcon } from "@heroicons/react/24/outline";
import { formatDecimal, imc } from "@lod/core";
import { useState, type FormEvent } from "react";
import { Button, Field } from "../../ui/forms";
import { Sheet } from "../../ui/Sheet";
import { TrendBadge } from "./TrendBadge";
import { TONE_BOX, TONE_PILL, TONE_TEXT } from "./tones";

const { findEntryOnDate, formatDate, newEntry, todayIso, validateEntryInput } = imc;

interface NewEntrySheetProps {
  open: boolean;
  onClose: () => void;
  entries: imc.ImcEntry[];
  lastHeightCm: number | undefined;
  onSave: (entry: imc.ImcEntry) => void;
}

export function NewEntrySheet({ open, onClose, ...props }: NewEntrySheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle pesée" tall>
      <NewEntryForm {...props} onDone={onClose} />
    </Sheet>
  );
}

function NewEntryForm({
  entries,
  lastHeightCm,
  onSave,
  onDone,
}: Omit<NewEntrySheetProps, "open" | "onClose"> & { onDone: () => void }) {
  const today = todayIso();
  const [input, setInput] = useState<imc.EntryInput>({
    date: today,
    weightKg: "",
    // La taille change rarement chez l'adulte : on reprend la dernière.
    heightCm: lastHeightCm === undefined ? "" : formatDecimal(lastHeightCm),
  });
  const [errors, setErrors] = useState<imc.InputErrors<imc.EntryInput>>({});
  // Garde-fou « un jour = une mesure » : prise saisie en attente du choix de l'utilisateur.
  const [conflict, setConflict] = useState<{ existing: imc.ImcEntry; candidate: imc.ImcEntry } | null>(null);

  const set = (field: keyof imc.EntryInput) => (e: { target: { value: string } }) =>
    setInput((current) => ({ ...current, [field]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateEntryInput(input, today);
    setErrors(result.errors);
    if (!result.entry) return;
    const candidate = newEntry(result.entry.date, result.entry.weightKg, result.entry.heightCm);
    const existing = findEntryOnDate(entries, candidate.date);
    if (existing) {
      setConflict({ existing, candidate });
      return;
    }
    onSave(candidate);
    onDone();
  };

  if (conflict) {
    const option = (label: string, entry: imc.ImcEntry, onClick: () => void) => (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-start gap-1 rounded-2xl border border-border bg-background px-4 py-3 text-left active:border-primary active:bg-primary/5"
      >
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="text-lg font-semibold text-foreground tabular-nums">{formatDecimal(entry.weightKg)} kg</span>
        <span className="text-sm text-muted-foreground">Taille : {formatDecimal(entry.heightCm)} cm</span>
      </button>
    );
    return (
      <div role="alertdialog" aria-labelledby="imc-same-day" className="flex flex-col gap-3">
        <p id="imc-same-day" className="font-semibold text-foreground">
          Une pesée existe déjà le {formatDate(conflict.existing.date)}.
        </p>
        <p className="text-sm text-muted-foreground">On garde une mesure par jour. Laquelle conserver ?</p>
        {option("Garder l'ancienne", conflict.existing, onDone)}
        {option("Garder la nouvelle", conflict.candidate, () => {
          onSave(conflict.candidate);
          onDone();
        })}
        <Button variant="secondary" onClick={() => setConflict(null)}>
          Modifier ma saisie
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field
        id="imc-weight"
        label="Poids"
        suffix="kg"
        type="text"
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        placeholder="Ex. : 72,5"
        value={input.weightKg}
        onChange={set("weightKg")}
        error={errors.weightKg}
        autoFocus
      />
      <Field
        id="imc-height"
        label="Taille"
        suffix="cm"
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        placeholder="Ex. : 170"
        value={input.heightCm}
        onChange={set("heightCm")}
        error={errors.heightCm}
      />
      <Field id="imc-date" label="Date" type="date" max={today} value={input.date} onChange={set("date")} error={errors.date} />
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}

interface EntryDetailSheetProps {
  row: imc.ImcRow | null;
  onClose: () => void;
  onRemove: (id: string) => void;
  // Dates où l'outil Masse maigre a des mensurations, qui s'appuient sur la pesée du jour.
  measurementDates: ReadonlySet<string>;
}

// Détail d'une pesée : IMC, catégorie, commentaire du jour, et suppression (avec confirmation).
export function EntryDetailSheet({ row, onClose, onRemove, measurementDates }: EntryDetailSheetProps) {
  return (
    <Sheet open={row !== null} onClose={onClose} title={row ? `Pesée du ${formatDate(row.date)}` : "Pesée"}>
      {row && (
        <EntryDetail row={row} onClose={onClose} onRemove={onRemove} measurementDates={measurementDates} />
      )}
    </Sheet>
  );
}

function EntryDetail({
  row,
  onClose,
  onRemove,
  measurementDates,
}: { row: imc.ImcRow } & Omit<EntryDetailSheetProps, "row">) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">IMC</p>
          <p className="text-4xl font-semibold text-foreground tabular-nums">{formatDecimal(row.bmi)}</p>
          <TrendBadge row={row} />
        </div>
        <span className={`mb-1 rounded-full px-3 py-1 text-sm font-semibold ${TONE_PILL[row.tone]}`}>
          {row.category}
        </span>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatDecimal(row.weightKg)} kg · {formatDecimal(row.heightCm)} cm
      </p>
      <p className={`rounded-xl border px-4 py-3 text-sm font-medium ${TONE_BOX[row.tone]} ${TONE_TEXT[row.tone]}`}>
        {row.comment}
      </p>
      {confirming ? (
        <div role="alertdialog" aria-labelledby="imc-confirm" className="flex flex-col gap-3">
          <p id="imc-confirm" className="text-sm font-semibold text-foreground">
            Supprimer définitivement cette pesée ?
          </p>
          {measurementDates.has(row.date) && (
            <p className="-mt-1 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-text">
              Vos mensurations du même jour (outil Masse maigre) utilisent cette pesée : elles ne pourront plus être
              calculées.
            </p>
          )}
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
        <Button variant="secondary" className="text-destructive" onClick={() => setConfirming(true)}>
          <TrashIcon className="h-5 w-5" aria-hidden="true" />
          Supprimer cette pesée
        </Button>
      )}
    </div>
  );
}
