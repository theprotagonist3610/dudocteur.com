import { CheckCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { formatDecimal, imc, minceur, type poids } from "@lod/core";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "../../ui/forms";

const {
  ACTIVITY_TIPS,
  DIET_INFO,
  FASTING_WARNING,
  GENERAL_TIPS,
  HABITS,
  HABIT_LABELS,
  MEAL_RHYTHM_INFO,
  formatDate,
  formatInteger,
  intakePlan,
  progress,
  todayIso,
  weekStartIso,
  weighedThisWeek,
} = minceur;

interface PlanViewProps {
  plan: minceur.Plan;
  sex: poids.BiologicalSex;
  latest: imc.ImcRow;
  needsKcal: number;
  entryDates: string[];
  habits: minceur.MinceurData["habits"];
  onToggleHabit: (week: string, habit: minceur.Habit) => void;
  onEdit: () => void;
  onStop: () => void;
}

export function PlanView({ plan, sex, latest, needsKcal, entryDates, habits, onToggleHabit, onEdit, onStop }: PlanViewProps) {
  const today = todayIso();
  // L'apport suit les besoins actuels : ils baissent avec le poids.
  const intake = intakePlan(needsKcal, plan.pace, sex);
  const p = progress(plan, latest.weightKg, plan.effectivePace, today);
  const reached = p.remainingKg === 0;
  const [confirmStop, setConfirmStop] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Manger moins : l'apport du jour. */}
      <section aria-label="Apport conseillé" className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
        <p className="text-sm text-muted-foreground">Votre apport conseillé</p>
        <p className="text-4xl font-semibold text-foreground tabular-nums">
          {formatInteger(intake.intakeKcal)} <span className="text-lg font-normal text-muted-foreground">kcal/jour</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          Besoins {formatInteger(needsKcal)} − déficit {formatInteger(intake.deficitKcal)} kcal · {MEAL_RHYTHM_INFO[plan.rhythm].label} ·{" "}
          {DIET_INFO[plan.diet].label.toLowerCase()}
        </p>
      </section>

      {/* Progression vers l'objectif (objectif partagé avec l'IMC). */}
      <section aria-label="Ma progression" className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold text-foreground">Ma progression</h2>
          <span className="text-sm font-semibold text-foreground tabular-nums">{p.percent} %</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary" style={{ width: `${p.percent}%` }} />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="Départ" value={`${formatDecimal(plan.startWeightKg)} kg`} />
          <Stat label="Aujourd'hui" value={`${formatDecimal(latest.weightKg)} kg`} />
          <Stat label="Objectif" value={`${formatDecimal(plan.targetWeightKg)} kg`} />
        </dl>
        <p className="mt-3 text-sm text-foreground">
          {reached ? (
            <span className="font-semibold text-success">Objectif atteint, bravo ! Pensez à stabiliser votre poids.</span>
          ) : (
            <>
              {p.lostKg > 0 ? `${formatDecimal(p.lostKg)} kg perdus, ` : ""}encore{" "}
              <span className="font-semibold">{formatDecimal(p.remainingKg)} kg</span> d'ici le{" "}
              {formatDate(plan.endDate)}.{" "}
              {p.aheadKg >= 0.3 ? (
                <span className="text-success">En avance sur votre trajectoire.</span>
              ) : p.aheadKg <= -0.5 ? (
                <span className="text-warning-text">Un peu en retard : c'est normal, le poids varie d'un jour à l'autre.</span>
              ) : (
                <span className="text-muted-foreground">Dans les temps.</span>
              )}
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Dernière pesée le {formatDate(latest.date)}.{" "}
          <Link to="/imc" className="font-medium underline">
            Voir la courbe dans l'outil IMC
          </Link>
        </p>
      </section>

      {/* 3. Les habitudes de la semaine. */}
      <Habits entryDates={entryDates} habits={habits} onToggle={onToggleHabit} today={today} />

      {/* Conseils : 1. manger, 2. bouger. */}
      <section aria-label="Mes conseils" className="flex flex-col gap-2">
        <h2 className="font-semibold text-foreground">Mes conseils</h2>
        <Accordion title={`Mes repas : ${MEAL_RHYTHM_INFO[plan.rhythm].label}`}>
          <p>{MEAL_RHYTHM_INFO[plan.rhythm].summary}</p>
          <Tips items={MEAL_RHYTHM_INFO[plan.rhythm].tips} />
          {plan.rhythm !== "classique" && <p className="text-warning-text">{FASTING_WARNING}</p>}
        </Accordion>
        <Accordion title={`Mon alimentation : ${DIET_INFO[plan.diet].label.toLowerCase()}`}>
          <p>{DIET_INFO[plan.diet].summary}</p>
          <Tips items={[...DIET_INFO[plan.diet].tips, ...GENERAL_TIPS]} />
        </Accordion>
        <Accordion title="Bouger plus">
          <Tips items={ACTIVITY_TIPS} />
        </Accordion>
      </section>

      <Button variant="secondary" onClick={onEdit}>
        Modifier mon programme
      </Button>
      {confirmStop ? (
        <div role="alertdialog" aria-labelledby="minceur-stop" className="flex flex-col gap-3 rounded-2xl border border-border p-4">
          <p id="minceur-stop" className="text-sm font-semibold text-foreground">
            Arrêter le programme ?
          </p>
          <p className="-mt-2 text-sm text-muted-foreground">
            Son objectif est retiré de l'outil IMC. Vos pesées sont conservées.
          </p>
          <Button variant="danger" onClick={onStop}>
            Arrêter le programme
          </Button>
          <Button variant="secondary" onClick={() => setConfirmStop(false)}>
            Continuer le programme
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmStop(true)}
          className="h-11 text-sm font-medium text-muted-foreground underline"
        >
          Arrêter le programme
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-2 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

// Habitudes de la semaine (du lundi au dimanche) ; la pesée est cochée d'après l'IMC.
function Habits({
  entryDates,
  habits,
  onToggle,
  today,
}: {
  entryDates: string[];
  habits: minceur.MinceurData["habits"];
  onToggle: (week: string, habit: minceur.Habit) => void;
  today: string;
}) {
  const week = weekStartIso(today);
  const done = new Set(habits[week] ?? []);
  if (weighedThisWeek(entryDates, today)) done.add("pesee");
  return (
    <section aria-label="Mes habitudes de la semaine" className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-foreground">Mes habitudes de la semaine</h2>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {done.size}/{HABITS.length}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Semaine du {formatDate(week)}. Cochez ce que vous avez tenu.</p>
      <ul className="mt-2 flex flex-col">
        {HABITS.map((habit) => {
          const checked = done.has(habit);
          const auto = habit === "pesee";
          return (
            <li key={habit}>
              <label
                className={`flex min-h-14 items-center gap-3 py-2 ${auto ? "cursor-default" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={auto}
                  onChange={() => onToggle(week, habit)}
                  className="h-5 w-5 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${checked ? "text-success" : "text-foreground"}`}>
                    {HABIT_LABELS[habit].label}
                    {checked && <CheckCircleIcon className="ml-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />}
                  </span>
                  <span className="block text-xs text-muted-foreground">{HABIT_LABELS[habit].detail}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {!done.has("pesee") && (
        <Link to="/imc" className="mt-1 inline-flex h-11 items-center text-sm font-semibold text-primary underline">
          Me peser dans l'outil IMC
        </Link>
      )}
    </section>
  );
}

function Accordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-sm font-semibold text-foreground"
      >
        <span className="flex-1">{title}</span>
        <ChevronDownIcon className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="flex flex-col gap-2 px-4 pb-4 text-sm text-foreground">{children}</div>}
    </div>
  );
}

function Tips({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
