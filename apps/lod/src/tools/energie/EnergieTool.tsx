import { ChevronRightIcon, ExclamationTriangleIcon, FlagIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { energie, formatDecimal, poids } from "@lod/core";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "../../ui/forms";
import { Segmented } from "../../ui/Segmented";
import { useImcData } from "../imc/data";
import { NewEntrySheet } from "../imc/EntrySheets";
import { usePoidsData } from "../poids/data";
import { useEnergieData } from "./data";

const {
  DIGESTION_SHARE,
  JOBS,
  JOB_ACTIVITIES,
  LEAN_MASS_SOURCE_LABELS,
  MINCEUR_TOOL_ID,
  WORK_DAYS_RANGE,
  computeEnergyNeeds,
  formatInteger,
} = energie;
const { POIDS_TOOL_ID, formatDate, latestComposition } = poids;

const SEX_OPTIONS = [
  { id: "homme", label: "Homme" },
  { id: "femme", label: "Femme" },
] as const;

export default function EnergieTool() {
  const imcData = useImcData();
  const poidsData = usePoidsData();
  const { activity, saved, setActivity } = useEnergieData();
  const [sheet, setSheet] = useState(false);

  const latestEntry = imcData.rows.at(-1);
  // Même masse maigre (donc même métabolisme de base) que dans l'outil Masse maigre.
  const composition = latestComposition(poidsData, imcData.entries);
  const sex = poidsData.sex;

  const needs =
    sex && latestEntry && composition
      ? computeEnergyNeeds({ leanMassKg: composition.leanMassKg, ...activity })
      : null;

  return (
    <div className="flex flex-col gap-5">
      {(!saved || !imcData.saved || !poidsData.saved) && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Vos données n'ont pas pu être enregistrées sur ce téléphone (navigation privée ou mémoire pleine). Elles
          seront perdues à la fermeture de la page.
        </p>
      )}

      {sex === "femme" && (
        <p
          role="note"
          className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-text"
        >
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Enceinte ou allaitante ? Vos besoins sont plus élevés : ces calculs ne s'appliquent pas. Demandez conseil à
          votre médecin ou à votre sage-femme.
        </p>
      )}

      {needs ? (
        <Totals needs={needs} />
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
          {!sex ? "Indiquez votre sexe" : "Ajoutez une pesée"} pour calculer vos besoins énergétiques.
        </p>
      )}

      <Section title="Vous">
        <div>
          <Segmented label="Sexe" options={SEX_OPTIONS} value={sex} onChange={poidsData.setSex} />
          <p className="mt-1 text-xs text-muted-foreground">Le même choix que dans l'outil Masse maigre.</p>
        </div>
        <dl className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-muted-foreground">
              Poids et taille
              {latestEntry && <span className="block text-xs">pesée du {formatDate(latestEntry.date)} (IMC)</span>}
            </dt>
            <dd className="text-right font-semibold text-foreground tabular-nums">
              {latestEntry ? `${formatDecimal(latestEntry.weightKg)} kg · ${formatDecimal(latestEntry.heightCm)} cm` : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-muted-foreground">
              Masse maigre
              {composition && (
                <span className="block text-xs">
                  {LEAN_MASS_SOURCE_LABELS[composition.formula]} ({formatDate(composition.date)})
                </span>
              )}
            </dt>
            <dd className="text-right font-semibold text-foreground tabular-nums">
              {composition ? `${formatDecimal(composition.leanMassKg)} kg` : "—"}
            </dd>
          </div>
        </dl>
        <div className="grid grid-cols-2 gap-3">
          {/* Sans icône : à demi-largeur, le libellé tiendrait sinon sur deux lignes. */}
          <Button variant="secondary" className="px-3 text-sm whitespace-nowrap" onClick={() => setSheet(true)}>
            Nouvelle pesée
          </Button>
          <Link
            to={`/${POIDS_TOOL_ID}`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-3 text-sm font-semibold text-foreground active:bg-muted md:hover:border-primary/50"
          >
            Masse maigre
          </Link>
        </div>
      </Section>

      <Section title="Votre métier">
        <div role="radiogroup" aria-label="Activité au travail" className="flex flex-col gap-2">
          {JOBS.map((job) => {
            const selected = activity.job === job;
            return (
              <button
                key={job}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setActivity({ job })}
                className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-2 text-left transition ${
                  selected ? "border-primary bg-primary/5" : "border-border bg-surface active:bg-muted"
                }`}
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded-full ${selected ? "border-[6px] border-primary" : "border-2 border-border"}`}
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{JOB_ACTIVITIES[job].label}</span>
                  <span className="block text-xs text-muted-foreground">{JOB_ACTIVITIES[job].examples}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Stepper
          label="Jours travaillés par semaine"
          value={activity.workDaysPerWeek}
          range={WORK_DAYS_RANGE}
          onChange={(workDaysPerWeek) => setActivity({ workDaysPerWeek })}
        />
      </Section>

      {needs && composition && <Breakdown needs={needs} composition={composition} activity={activity} />}

      {/* Suite naturelle une fois les besoins connus. */}
      <Link
        to={`/${MINCEUR_TOOL_ID}`}
        className="flex min-h-18 items-center gap-4 rounded-2xl border border-primary/40 bg-surface p-4 shadow-sm transition active:scale-[0.98] active:bg-muted md:hover:shadow-md"
      >
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FlagIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">Programme minceur</span>
          <span className="block text-sm text-muted-foreground">Perdre du poids à votre rythme, à partir de vos besoins.</span>
        </span>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      <p className="text-xs text-muted-foreground">
        Estimations indicatives : elles ne remplacent pas un avis médical ou celui d'un diététicien.
      </p>

      <NewEntrySheet
        open={sheet}
        onClose={() => setSheet(false)}
        entries={imcData.entries}
        lastHeightCm={latestEntry?.heightCm}
        onSave={imcData.saveEntry}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

// Résultat en tête, mis à jour à chaque réglage.
function Totals({ needs }: { needs: energie.EnergyNeeds }) {
  return (
    <section aria-label="Vos besoins énergétiques" aria-live="polite" className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
      <p className="text-sm text-muted-foreground">Vos besoins</p>
      <p className="text-4xl font-semibold text-foreground tabular-nums">
        {formatInteger(needs.dailyKcal)} <span className="text-lg font-normal text-muted-foreground">kcal/jour</span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground tabular-nums">
        {formatInteger(needs.weeklyKcal)} kcal par semaine · {formatInteger(needs.monthlyKcal)} kcal par mois
      </p>
    </section>
  );
}

// Choix d'un petit nombre entier par − / + (plus sûr au doigt qu'un clavier pour 0 à 7).
function Stepper({
  label,
  value,
  range,
  onChange,
}: {
  label: string;
  value: number;
  range: { min: number; max: number };
  onChange: (value: number) => void;
}) {
  const button = "inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-foreground active:bg-muted disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-3">
      <span id="stepper-label" className="text-sm font-medium text-foreground">
        {label}
      </span>
      <div className="flex items-center gap-3" role="group" aria-labelledby="stepper-label">
        <button type="button" aria-label="Un jour de moins" className={button} disabled={value <= range.min} onClick={() => onChange(value - 1)}>
          <MinusIcon className="h-5 w-5" />
        </button>
        <output aria-live="polite" className="w-6 text-center text-lg font-semibold text-foreground tabular-nums">
          {value}
        </output>
        <button type="button" aria-label="Un jour de plus" className={button} disabled={value >= range.max} onClick={() => onChange(value + 1)}>
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

const COMPONENT_LABELS: Record<energie.EnergyComponent, string> = {
  metabolisme: "Métabolisme de base",
  metier: "Activité du métier",
  digestion: "Digestion des repas",
};

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

interface BreakdownProps {
  needs: energie.EnergyNeeds;
  composition: poids.LeanMassRow;
  activity: energie.Activity;
}

/*
  Tout est en kcal par jour. Le métier n'est pas quotidien : on montre sa dépense de
  la semaine, puis sa répartition sur 7 jours, pour que la valeur par jour ne soit
  pas lue comme une valeur hebdomadaire.
*/
function Breakdown({ needs, composition, activity }: BreakdownProps) {
  const details: Record<energie.EnergyComponent, string> = {
    metabolisme: `Katch-McArdle, masse maigre ${formatDecimal(composition.leanMassKg)} kg`,
    metier:
      activity.workDaysPerWeek === 0
        ? "Aucun jour travaillé"
        : `${formatInteger(needs.weeklyMetierKcal)} kcal sur vos ${plural(activity.workDaysPerWeek, "jour")} de travail, réparties sur 7 jours`,
    digestion: `${DIGESTION_SHARE * 100} % de la dépense`,
  };
  return (
    <section aria-label="Détail du besoin par jour" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold text-foreground">Ce qui compose votre besoin par jour</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Valeurs en kcal par jour. Le métier n'est pas quotidien : sa dépense de la semaine est répartie sur les 7
        jours.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {(Object.keys(COMPONENT_LABELS) as energie.EnergyComponent[]).map((id) => {
          const kcal = needs.components[id];
          const share = needs.dailyKcal > 0 ? (kcal / needs.dailyKcal) * 100 : 0;
          return (
            <li key={id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  <span className="block text-foreground">{COMPONENT_LABELS[id]}</span>
                  <span className="block text-xs text-muted-foreground">{details[id]}</span>
                </span>
                <span className="shrink-0 font-semibold text-foreground tabular-nums">
                  {formatInteger(kcal)} kcal/j{" "}
                  <span className="font-normal text-muted-foreground">({Math.round(share)} %)</span>
                </span>
              </div>
              {/* Barre proportionnelle : une seule couleur, la longueur porte l'information. */}
              <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 border-t border-border pt-3 text-sm font-semibold text-foreground">
        Total : {formatInteger(needs.dailyKcal)} kcal par jour
      </p>
    </section>
  );
}
