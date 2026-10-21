import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { energie, formatDecimal, imc, minceur, poids } from "@lod/core";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../../ui/forms";
import { Segmented } from "../../ui/Segmented";
import { useEnergieData } from "../energie/data";
import { useImcData } from "../imc/data";
import { NewEntrySheet } from "../imc/EntrySheets";
import { usePoidsData } from "../poids/data";
import { useMinceurData } from "./data";
import { PlanView } from "./PlanView";
import { SetupForm } from "./SetupForm";

const SEX_OPTIONS = [
  { id: "homme", label: "Homme" },
  { id: "femme", label: "Femme" },
] as const;

/*
  Le programme s'appuie sur les autres outils, sans rien ressaisir : pesées (IMC),
  sexe et masse maigre (Masse maigre), activité au travail (Besoins énergétiques).
  Son objectif est un objectif de l'IMC, visible dans ses objectifs et ses courbes.
*/
export default function MinceurTool() {
  const imcData = useImcData();
  const poidsData = usePoidsData();
  const { activity } = useEnergieData();
  const minceurData = useMinceurData();
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState(false);

  const latest = imcData.rows.at(-1);
  const composition = poids.latestComposition(poidsData, imcData.entries);
  const needs = composition ? energie.computeEnergyNeeds({ leanMassKg: composition.leanMassKg, ...activity }) : null;
  const sex = poidsData.sex;
  const plan = minceurData.plan;

  const savedOk = imcData.saved && poidsData.saved && minceurData.saved;

  let content;
  if (!sex || !latest || !needs) {
    content = (
      <section aria-label="Avant de commencer" className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-5">
        <p className="font-semibold text-foreground">Avant de commencer</p>
        <p className="text-sm text-muted-foreground">
          Le programme part de votre poids et de vos besoins énergétiques. Il lui faut :
        </p>
        {!sex && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Votre sexe</p>
            <Segmented label="Sexe" options={SEX_OPTIONS} value={sex} onChange={poidsData.setSex} />
          </div>
        )}
        {!latest && <Button onClick={() => setSheet(true)}>Ajouter ma pesée</Button>}
      </section>
    );
  } else if (minceur.eligibility(latest.weightKg, latest.heightCm) === "maigreur" && !plan) {
    content = (
      <p role="alert" className="rounded-2xl border border-warning/50 bg-warning/10 px-5 py-4 text-sm text-warning-text">
        Votre IMC ({formatDecimal(latest.bmi)}) est inférieur à {formatDecimal(imc.NORMAL_BMI_RANGE.min)} : perdre du
        poids n'est pas recommandé. Parlez-en à votre médecin si vous avez un doute sur votre alimentation.
      </p>
    );
  } else if (!plan || editing) {
    content = (
      <SetupForm
        sex={sex}
        latest={latest}
        needsKcal={needs.dailyKcal}
        entries={imcData.entries}
        goals={imcData.goals}
        current={plan}
        onCancel={plan ? () => setEditing(false) : undefined}
        onStart={(next) => {
          // Un seul objectif IMC par programme : l'ancien est remplacé.
          if (plan?.goalId) imcData.removeGoal(plan.goalId);
          const goal = imc.newGoal(next.endDate, next.targetWeightKg);
          imcData.addGoal(goal);
          minceurData.setPlan({ ...next, goalId: goal.id });
          setEditing(false);
        }}
      />
    );
  } else {
    content = (
      <PlanView
        plan={plan}
        sex={sex}
        latest={latest}
        needsKcal={needs.dailyKcal}
        entryDates={imcData.entries.map((e) => e.date)}
        habits={minceurData.habits}
        onToggleHabit={minceurData.toggleHabit}
        onEdit={() => setEditing(true)}
        onStop={() => {
          if (plan.goalId) imcData.removeGoal(plan.goalId);
          minceurData.setPlan(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!savedOk && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Vos données n'ont pas pu être enregistrées sur ce téléphone (navigation privée ou mémoire pleine). Elles
          seront perdues à la fermeture de la page.
        </p>
      )}
      {latest && latest.bmi >= minceur.DOCTOR_BMI && (
        <p
          role="note"
          className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-text"
        >
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Avec un IMC de {formatDecimal(latest.bmi)}, parlez-en à votre médecin : il peut vous accompagner et vous
          proposer d'autres solutions.
        </p>
      )}
      {content}
      <p className="text-xs text-muted-foreground">
        Programme indicatif : il ne remplace pas l'avis d'un médecin ou d'un diététicien. Besoins calculés dans l'outil{" "}
        <Link to={`/${energie.ENERGIE_TOOL_ID}`} className="font-medium underline">
          Besoins énergétiques
        </Link>
        .
      </p>
      <NewEntrySheet
        open={sheet}
        onClose={() => setSheet(false)}
        entries={imcData.entries}
        lastHeightCm={latest?.heightCm}
        onSave={imcData.saveEntry}
      />
    </div>
  );
}
