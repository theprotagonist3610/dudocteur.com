import { formatDecimal, imc, minceur, type poids } from "@lod/core";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Field } from "../../ui/forms";
import { Segmented } from "../../ui/Segmented";

const { DIETS, DIET_INFO, MEAL_RHYTHMS, MEAL_RHYTHM_INFO, PACES, addDays, daysToLose, formatDate, formatInteger, intakePlan } =
  minceur;

const PACE_OPTIONS = PACES.map((id) => ({ id: String(id), label: `${formatDecimal(id)} kg` }));
const RHYTHM_OPTIONS = MEAL_RHYTHMS.map((id) => ({ id, label: MEAL_RHYTHM_INFO[id].label }));

interface SetupFormProps {
  sex: poids.BiologicalSex;
  latest: imc.ImcRow;
  needsKcal: number;
  entries: imc.ImcEntry[];
  goals: imc.ImcGoal[];
  current: minceur.Plan | null; // programme à modifier, s'il y en a un
  onCancel?: () => void;
  onStart: (plan: Omit<minceur.Plan, "goalId">) => void;
}

// Poids visé proposé : le prochain objectif IMC sous le poids actuel, sinon celui d'un IMC de 24,9.
function defaultTarget(latest: imc.ImcRow, goals: imc.ImcGoal[], current: minceur.Plan | null): string {
  if (current) return formatDecimal(current.targetWeightKg);
  const goal = goals.find((g) => g.date > imc.todayIso() && g.weightKg < latest.weightKg);
  const target = goal?.weightKg ?? minceur.suggestedTargetKg(latest.weightKg, latest.heightCm);
  return target === null ? "" : formatDecimal(target);
}

export function SetupForm({ sex, latest, needsKcal, entries, goals, current, onCancel, onStart }: SetupFormProps) {
  const [input, setInput] = useState<minceur.PlanInput>({
    targetWeightKg: defaultTarget(latest, goals, current),
    pace: current?.pace ?? 0.5,
    rhythm: current?.rhythm ?? "classique",
    diet: current?.diet ?? "volume",
    adult: current !== null,
    notPregnant: current !== null,
  });
  const [errors, setErrors] = useState<imc.InputErrors<minceur.PlanInput>>({});
  const set = <K extends keyof minceur.PlanInput>(key: K, value: minceur.PlanInput[K]) =>
    setInput((d) => ({ ...d, [key]: value }));

  // Aperçu en direct : apport conseillé et date d'arrivée.
  const intake = intakePlan(needsKcal, input.pace, sex);
  const target = imc.parseDecimal(input.targetWeightKg);
  const days = Number.isNaN(target) ? null : daysToLose(latest.weightKg - target, intake.effectivePace);
  const today = imc.todayIso();
  const endDate = days ? addDays(today, days) : null;

  // L'objectif du programme remplace l'éventuel objectif IMC du programme précédent.
  const otherGoals = goals.filter((g) => g.id !== current?.goalId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = minceur.validatePlanInput(input, { weightKg: latest.weightKg, heightCm: latest.heightCm, sex });
    if (!result.targetWeightKg || !endDate) {
      setErrors(result.errors);
      return;
    }
    if (intake.deficitKcal === 0) {
      setErrors({ form: "Vos besoins sont déjà proches de l'apport minimal : parlez-en à votre médecin." });
      return;
    }
    // Même règle de rythme que les objectifs de l'IMC (au plus 1 kg par semaine), et pas de conflit avec eux.
    const conflict = imc.validateGoal({ date: endDate, weightKg: result.targetWeightKg }, entries, otherGoals, today);
    if (conflict) {
      setErrors({ form: `Cet objectif entre en conflit avec vos objectifs de l'outil IMC : ${conflict}` });
      return;
    }
    setErrors({});
    onStart({
      startDate: today,
      startWeightKg: latest.weightKg,
      targetWeightKg: result.targetWeightKg,
      pace: input.pace,
      effectivePace: intake.effectivePace,
      endDate,
      rhythm: input.rhythm,
      diet: input.diet,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Aujourd'hui : <span className="font-semibold text-foreground">{formatDecimal(latest.weightKg)} kg</span> pour{" "}
        {formatDecimal(latest.heightCm)} cm (IMC {formatDecimal(latest.bmi)}), besoins de{" "}
        <span className="font-semibold text-foreground">{formatInteger(needsKcal)} kcal/jour</span>.
      </p>

      <Step title="1. Mon objectif">
        <Field
          id="minceur-target"
          label="Poids visé"
          suffix="kg"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={input.targetWeightKg}
          onChange={(e) => set("targetWeightKg", e.target.value)}
          error={errors.targetWeightKg}
          hint="Proposé : votre objectif de l'outil IMC, ou le haut de la zone normale (IMC 24,9)."
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Rythme par semaine</p>
          <Segmented
            label="Rythme par semaine"
            options={PACE_OPTIONS}
            value={String(input.pace)}
            onChange={(v) => set("pace", Number(v) as minceur.Pace)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            0,5 à 1 kg par semaine : un rythme durable, qui limite la reprise de poids.
          </p>
        </div>
      </Step>

      <Step title="2. Mes repas">
        <Segmented label="Rythme des repas" options={RHYTHM_OPTIONS} value={input.rhythm} onChange={(v) => set("rhythm", v)} />
        <p className="text-sm text-muted-foreground">{MEAL_RHYTHM_INFO[input.rhythm].summary}</p>
        {input.rhythm !== "classique" && <p className="text-xs text-warning-text">{minceur.FASTING_WARNING}</p>}
      </Step>

      <Step title="3. Mon alimentation">
        <div role="radiogroup" aria-label="Type d'alimentation" className="flex flex-col gap-2">
          {DIETS.map((diet) => {
            const selected = input.diet === diet;
            return (
              <button
                key={diet}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set("diet", diet)}
                className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-2 text-left transition ${
                  selected ? "border-primary bg-primary/5" : "border-border bg-surface active:bg-muted"
                }`}
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded-full ${selected ? "border-[6px] border-primary" : "border-2 border-border"}`}
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{DIET_INFO[diet].label}</span>
                  <span className="block text-xs text-muted-foreground">{DIET_INFO[diet].summary}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Step>

      {/* Aperçu du programme, mis à jour à chaque réglage. */}
      <section aria-label="Aperçu du programme" aria-live="polite" className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
        <p className="text-sm text-muted-foreground">Apport conseillé</p>
        <p className="text-4xl font-semibold text-foreground tabular-nums">
          {formatInteger(intake.intakeKcal)} <span className="text-lg font-normal text-muted-foreground">kcal/jour</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          Vos besoins ({formatInteger(needsKcal)}) − {formatInteger(intake.deficitKcal)} kcal de déficit par jour
        </p>
        {intake.limited && (
          <p className="mt-2 text-sm text-warning-text">
            Pour rester au-dessus de l'apport minimal ({formatInteger(minceur.MIN_INTAKE_KCAL[sex])} kcal/jour), le
            rythme est ramené à environ {formatDecimal(intake.effectivePace)} kg par semaine.
          </p>
        )}
        {endDate && days ? (
          <p className="mt-2 text-sm text-foreground">
            Objectif atteint vers le <span className="font-semibold">{formatDate(endDate)}</span> (environ{" "}
            {Math.round(days / 7)} semaine{Math.round(days / 7) > 1 ? "s" : ""}). Il sera ajouté à vos objectifs de
            l'outil IMC.
          </p>
        ) : null}
      </section>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Confirmations</legend>
        <Check checked={input.adult} onChange={(v) => set("adult", v)} error={errors.adult}>
          J'ai 18 ans ou plus.
        </Check>
        {sex === "femme" && (
          <Check checked={input.notPregnant} onChange={(v) => set("notPregnant", v)} error={errors.notPregnant}>
            Je ne suis ni enceinte ni allaitante.
          </Check>
        )}
      </fieldset>

      {errors.form && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit">{current ? "Mettre à jour mon programme" : "Démarrer mon programme"}</Button>
      {onCancel && (
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      )}
    </form>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

// Case à cocher de 48 px de haut, toute la ligne est touchable.
function Check({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          className="h-5 w-5 shrink-0 accent-primary"
        />
        {children}
      </label>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
