import { ChevronDownIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { formatDecimal, imc, poids } from "@lod/core";
import { useState, type FormEvent } from "react";
import { Button, Field } from "../../ui/forms";
import { Sheet } from "../../ui/Sheet";

const { dayEntryEffect, formatDate, newMeasurement, todayIso, validateMeasurementInput } = poids;

interface MeasurementSheetProps {
  open: boolean;
  onClose: () => void;
  sex: poids.BiologicalSex;
  measurements: poids.MeasurementEntry[];
  // Pesées de l'IMC : seule source du poids et de la taille, partagée par les deux outils.
  entries: imc.ImcEntry[];
  onSave: (measurement: poids.MeasurementEntry, entry: imc.ImcEntry | null) => void;
}

export function MeasurementSheet({ open, onClose, ...props }: MeasurementSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Mes mensurations" tall>
      <MeasurementForm {...props} onDone={onClose} />
    </Sheet>
  );
}

const decimal = { type: "text", inputMode: "decimal", autoComplete: "off", enterKeyHint: "next" } as const;

// Poids et taille proposés pour une date : ceux de la pesée IMC de ce jour, sinon la dernière taille connue.
function dayValues(entries: imc.ImcEntry[], date: string) {
  const sameDay = entries.find((e) => e.date === date);
  const lastHeight = imc.sortByDate(entries).at(-1)?.heightCm;
  return {
    weightKg: sameDay ? formatDecimal(sameDay.weightKg) : "",
    heightCm: sameDay ? formatDecimal(sameDay.heightCm) : lastHeight === undefined ? "" : formatDecimal(lastHeight),
  };
}

function MeasurementForm({
  sex,
  measurements,
  entries,
  onSave,
  onDone,
}: Omit<MeasurementSheetProps, "open" | "onClose"> & { onDone: () => void }) {
  const today = todayIso();
  const latest = measurements.at(-1);
  const [input, setInput] = useState<poids.MeasurementInput>({
    date: today,
    ...dayValues(entries, today),
    // Le tour de cou varie peu : on repropose la dernière valeur.
    neckCm: latest ? formatDecimal(latest.neckCm) : "",
    waistCm: "",
    hipCm: "",
  });
  const [errors, setErrors] = useState<poids.InputErrors<poids.MeasurementInput>>({});
  const existing = measurements.find((m) => m.date === input.date);

  // Ce que l'enregistrement fera de la pesée IMC du jour (affiché sous le poids et la taille).
  const weightKg = imc.parseDecimal(input.weightKg);
  const heightCm = imc.parseDecimal(input.heightCm);
  const preview =
    Number.isNaN(weightKg) || Number.isNaN(heightCm) ? null : dayEntryEffect(entries, input.date, weightKg, heightCm);

  const set = (field: keyof poids.MeasurementInput) => (e: { target: { value: string } }) =>
    setInput((current) => ({ ...current, [field]: e.target.value }));

  // Changer de date reprend la pesée IMC de ce jour-là ; sans pesée ce jour-là, le poids est
  // vidé (pour ne pas enregistrer par mégarde celui d'un autre jour) et la taille gardée.
  const setDate = (e: { target: { value: string } }) => {
    const date = e.target.value;
    const sameDay = entries.some((entry) => entry.date === date);
    setInput((current) => ({ ...current, date, ...(sameDay ? dayValues(entries, date) : { weightKg: "" }) }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateMeasurementInput(input, sex, today);
    setErrors(result.errors);
    if (!result.measurement || !result.entry) return;
    const { date, weightKg, heightCm } = result.entry;
    // La pesée du jour n'est écrite dans l'IMC que si elle est nouvelle ou modifiée.
    const entry = dayEntryEffect(entries, date, weightKg, heightCm).effect === "identique" ? null : imc.newEntry(date, weightKg, heightCm);
    onSave(newMeasurement(result.measurement), entry);
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <MeasurementGuide sex={sex} />
      {/* La date d'abord : elle détermine la pesée IMC reprise. */}
      <Field
        id="poids-date"
        label="Date"
        type="date"
        max={today}
        value={input.date}
        onChange={setDate}
        error={errors.date}
        hint={
          existing
            ? `Des mensurations existent déjà le ${formatDate(existing.date)} : elles seront remplacées (une prise par jour).`
            : undefined
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <Field id="poids-weight" label="Poids" suffix="kg" {...decimal} value={input.weightKg} onChange={set("weightKg")} error={errors.weightKg} />
        <Field id="poids-height" label="Taille" suffix="cm" {...decimal} value={input.heightCm} onChange={set("heightCm")} error={errors.heightCm} />
        <Field id="poids-neck" label="Tour de cou" suffix="cm" {...decimal} value={input.neckCm} onChange={set("neckCm")} error={errors.neckCm} />
        <Field id="poids-waist" label="Tour de taille" suffix="cm" {...decimal} value={input.waistCm} onChange={set("waistCm")} error={errors.waistCm} />
        {/* Le tour de hanches n'entre dans la formule que pour une femme. */}
        {sex === "femme" && (
          <Field id="poids-hip" label="Tour de hanches" suffix="cm" {...decimal} enterKeyHint="done" value={input.hipCm} onChange={set("hipCm")} error={errors.hipCm} />
        )}
      </div>
      {preview && <DayEntryNote effect={preview.effect} existing={preview.existing} />}
      {errors.form && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}

// Le poids et la taille sont partagés avec l'IMC : on dit clairement ce qu'il adviendra de la pesée du jour.
function DayEntryNote({ effect, existing }: { effect: poids.DayEntryEffect; existing?: imc.ImcEntry }) {
  const text =
    effect === "ajoutee"
      ? "Ce poids et cette taille seront aussi ajoutés à vos pesées de l'outil IMC."
      : effect === "identique" || !existing
        ? "Poids et taille repris de votre pesée du jour dans l'outil IMC."
        : `Votre pesée du jour dans l'outil IMC (${formatDecimal(existing.weightKg)} kg, ${formatDecimal(existing.heightCm)} cm) sera remplacée par ces valeurs.`;
  return (
    <p
      role="status"
      className={`rounded-xl px-4 py-3 text-sm ${
        effect === "remplacee" ? "border border-warning/50 bg-warning/10 text-warning-text" : "bg-muted text-muted-foreground"
      }`}
    >
      {text}
    </p>
  );
}

// Guide de mesure : des mesures prises toujours de la même façon pour un suivi fiable.
const GUIDE: { title: string; steps: string[]; forSex?: poids.BiologicalSex }[] = [
  {
    title: "Avant de commencer",
    steps: [
      "Mesurez-vous le matin, à jeun, après être allé aux toilettes, toujours au même moment de la journée.",
      "Utilisez un mètre ruban souple de couturière, non élastique, posé à même la peau.",
      "Tenez-vous debout, détendu, pieds joints, et respirez normalement.",
      "Le ruban doit être bien horizontal, ajusté sans serrer ni creuser la peau.",
      "Prenez chaque mesure deux fois et gardez la moyenne.",
    ],
  },
  {
    title: "Poids et taille",
    steps: [
      "Pesez-vous sans chaussures et en sous-vêtements, sur une surface dure et plane.",
      "Pour la taille, dos contre un mur, talons joints, regard droit devant.",
    ],
  },
  {
    title: "Tour de cou",
    steps: [
      "Placez le ruban juste sous la pomme d'Adam (le relief de la gorge).",
      "Inclinez-le légèrement vers l'avant et le bas, en suivant la base du cou.",
      "Regardez droit devant vous, sans contracter le cou ni baisser les épaules.",
    ],
  },
  {
    title: "Tour de taille",
    steps: [
      "Homme : mesurez à hauteur du nombril.",
      "Femme : mesurez à l'endroit le plus étroit, entre le bas des côtes et le nombril.",
      "Relevez la mesure à la fin d'une expiration normale, sans rentrer le ventre.",
    ],
  },
  {
    title: "Tour de hanches",
    forSex: "femme",
    steps: [
      "Pieds joints, mesurez à l'endroit le plus large des fesses.",
      "Vérifiez dans un miroir que le ruban reste horizontal tout autour.",
    ],
  },
];

// Replié par défaut pour garder les champs en haut du panneau (au-dessus du clavier).
function MeasurementGuide({ sex }: { sex: poids.BiologicalSex }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-background">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-sm font-semibold text-foreground"
      >
        <InformationCircleIcon className="h-5 w-5 shrink-0 text-chart-reference" aria-hidden="true" />
        <span className="flex-1">Comment bien prendre ses mesures</span>
        <ChevronDownIcon className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {GUIDE.filter((section) => !section.forSex || section.forSex === sex).map((section) => (
            <section key={section.title}>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{section.title}</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-foreground">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
