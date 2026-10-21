import { formatDecimal, imc } from "@lod/core";
import { useState, type FormEvent } from "react";
import { Button, Field } from "../../ui/forms";
import { Sheet } from "../../ui/Sheet";

const { MAX_KG_PER_WEEK, RECOMMENDED_KG_PER_WEEK, formatDate, newGoal, realisticRange, todayIso, tomorrowIso, validateGoalInput } =
  imc;

interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  entries: imc.ImcEntry[];
  goals: imc.ImcGoal[];
  onSave: (goal: imc.ImcGoal) => void;
}

export function GoalSheet({ open, onClose, ...props }: GoalSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Objectif de poids" tall>
      <GoalForm {...props} onDone={onClose} />
    </Sheet>
  );
}

function GoalForm({ entries, goals, onSave, onDone }: Omit<GoalSheetProps, "open" | "onClose"> & { onDone: () => void }) {
  const tomorrow = tomorrowIso();
  const [input, setInput] = useState<imc.GoalInput>({ date: "", weightKg: "" });
  const [errors, setErrors] = useState<imc.InputErrors<imc.GoalInput>>({});

  // Fourchette réaliste pour la date choisie, affichée en direct pour guider la saisie.
  const range = input.date && input.date >= tomorrow ? realisticRange(input.date, entries, goals) : null;

  const set = (field: keyof imc.GoalInput) => (e: { target: { value: string } }) =>
    setInput((current) => ({ ...current, [field]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateGoalInput(input, entries, goals, todayIso());
    setErrors(result.errors);
    if (!result.goal) return;
    onSave(newGoal(result.goal.date, result.goal.weightKg));
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field
        id="imc-goal-date"
        label="Échéance"
        type="date"
        min={tomorrow}
        value={input.date}
        onChange={set("date")}
        error={errors.date}
      />
      <Field
        id="imc-goal-weight"
        label="Poids visé"
        suffix="kg"
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        placeholder="Ex. : 70"
        value={input.weightKg}
        onChange={set("weightKg")}
        error={errors.weightKg}
        hint={
          range ? (
            <>
              Réaliste au {formatDate(input.date)} :{" "}
              <span className="font-semibold text-foreground">
                entre {formatDecimal(range.min)} et {formatDecimal(range.max)} kg
              </span>{" "}
              (depuis {range.previous.kind === "pesee" ? "votre pesée" : "votre objectif"} du{" "}
              {formatDate(range.previous.date)}).
            </>
          ) : (
            <>
              Pour un résultat durable : {formatDecimal(RECOMMENDED_KG_PER_WEEK.min)} à{" "}
              {formatDecimal(RECOMMENDED_KG_PER_WEEK.max)} kg par semaine, au plus {MAX_KG_PER_WEEK} kg. Un seul
              objectif par jour.
            </>
          )
        }
      />
      {errors.form && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit">Enregistrer l'objectif</Button>
    </form>
  );
}
