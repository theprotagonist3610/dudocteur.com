import {
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { formatDecimal, imc } from "@lod/core";
import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../ui/forms";
import { Segmented } from "../../ui/Segmented";
import { usePoidsData } from "../poids/data";
import { useImcData } from "./data";
import { EntryDetailSheet, NewEntrySheet } from "./EntrySheets";
import { GoalSheet } from "./GoalSheet";
import { TONE_BOX, TONE_PILL, TONE_TEXT } from "./tones";
import { TrendBadge } from "./TrendBadge";

const { IDEAL_BMI, LEAN_MASS_TOOL_ID, formatDate, goalProgress, idealWeightKg, isNormalBmi, todayIso } =
  imc;

// Les courbes (et la bibliothèque de graphiques) ne sont téléchargées qu'à l'ouverture de l'onglet.
const ImcCharts = lazy(() => import("./ImcCharts"));

type TabId = "historique" | "courbes";

const TABS = [
  { id: "historique", label: "Historique" },
  { id: "courbes", label: "Courbes" },
] as const;

export default function ImcTool() {
  const { entries, rows, goals, saved, saveEntry, removeEntry, addGoal, removeGoal } = useImcData();
  const [sheet, setSheet] = useState<"pesee" | "objectif" | null>(null);
  const [detail, setDetail] = useState<imc.ImcRow | null>(null);
  const [tab, setTab] = useState<TabId>("historique");
  // Les mensurations de l'outil Masse maigre reposent sur la pesée du même jour.
  const { measurements } = usePoidsData();
  const measurementDates = useMemo(() => new Set(measurements.map((m) => m.date)), [measurements]);
  const latest = rows.at(-1);

  return (
    <div className="flex flex-col gap-5">
      {/* L'outil ne connaît pas le sexe : l'avertissement est affiché pour tous. */}
      <p
        role="note"
        className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-text"
      >
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Enceinte ? L'IMC et ses seuils ne s'appliquent pas pendant la grossesse.
      </p>

      {!saved && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Vos données n'ont pas pu être enregistrées sur ce téléphone (navigation privée ou mémoire pleine). Elles
          seront perdues à la fermeture de la page.
        </p>
      )}

      {latest ? <Summary row={latest} /> : <EmptyState />}

      <div className="flex flex-col gap-3">
        <Button onClick={() => setSheet("pesee")}>
          <PlusIcon className="h-5 w-5" aria-hidden="true" />
          Nouvelle pesée
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" className="text-sm" onClick={() => setSheet("objectif")} disabled={!latest}>
            <FlagIcon className="h-4 w-4" aria-hidden="true" />
            Objectif
          </Button>
          <Link
            to={`/${LEAN_MASS_TOOL_ID}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-foreground active:bg-muted md:hover:border-primary/50"
          >
            <BeakerIcon className="h-4 w-4" aria-hidden="true" />
            Masse maigre
          </Link>
        </div>
        {/* Fonctionnalité à venir : visible mais inactive. */}
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden="true" />
          Demander un accompagnement
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">Bientôt</span>
        </p>
      </div>

      {goals.length > 0 && latest && <Goals goals={goals} latest={latest} onRemove={removeGoal} />}

      {rows.length > 0 && (
        <section aria-label="Suivi">
          <Segmented
            kind="tab"
            label="Affichage"
            options={TABS}
            value={tab}
            onChange={setTab}
          />
          <div role="tabpanel" className="mt-4">
            {tab === "historique" ? (
              <History rows={rows} onSelect={setDetail} />
            ) : (
              <Suspense fallback={<p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>}>
                <ImcCharts rows={rows} goals={goals} />
              </Suspense>
            )}
          </div>
        </section>
      )}

      <NewEntrySheet
        open={sheet === "pesee"}
        onClose={() => setSheet(null)}
        entries={entries}
        lastHeightCm={latest?.heightCm}
        onSave={saveEntry}
      />
      <GoalSheet
        open={sheet === "objectif"}
        onClose={() => setSheet(null)}
        entries={entries}
        goals={goals}
        onSave={addGoal}
      />
      <EntryDetailSheet
        row={detail}
        onClose={() => setDetail(null)}
        onRemove={removeEntry}
        measurementDates={measurementDates}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
      <p className="font-semibold text-foreground">Aucune pesée pour l'instant</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Ajoutez votre poids et votre taille pour calculer votre IMC. Vos mesures restent sur ce téléphone.
      </p>
    </div>
  );
}

// Carte de la dernière pesée : IMC, catégorie, commentaire personnalisé, poids idéal.
function Summary({ row }: { row: imc.ImcRow }) {
  return (
    <section aria-label="Votre IMC" className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Votre IMC</p>
          <p className="text-5xl font-semibold text-foreground tabular-nums">{formatDecimal(row.bmi)}</p>
        </div>
        <span className={`mb-1 rounded-full px-3 py-1 text-sm font-semibold ${TONE_PILL[row.tone]}`}>
          {row.category}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Le {formatDate(row.date)} : {formatDecimal(row.weightKg)} kg pour {formatDecimal(row.heightCm)} cm
      </p>
      <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${TONE_BOX[row.tone]} ${TONE_TEXT[row.tone]}`}>
        {row.comment}
      </p>
      <p className="mt-4 text-sm text-foreground">
        Poids idéal pour votre taille (IMC {IDEAL_BMI}) :{" "}
        <span className="font-semibold tabular-nums">{formatDecimal(idealWeightKg(row.heightCm))} kg</span>
      </p>
    </section>
  );
}

// Objectifs pondéraux ; le prochain est mis en avant avec le poids restant.
function Goals({ goals, latest, onRemove }: { goals: imc.ImcGoal[]; latest: imc.ImcRow; onRemove: (id: string) => void }) {
  const today = todayIso();
  const next = goals.find((g) => g.date > today);
  const nextProgress = next && goalProgress(next, latest.weightKg, latest.heightCm);

  return (
    <section aria-label="Objectifs" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold text-foreground">Objectifs</h2>
      {next && nextProgress && (
        <p className="mt-1 text-sm text-foreground">
          Prochain : <span className="font-semibold">{formatDecimal(next.weightKg)} kg</span> le{" "}
          {formatDate(next.date)}.{" "}
          <span className={nextProgress.direction === "atteint" ? "text-success" : "text-muted-foreground"}>
            {nextProgress.direction === "atteint"
              ? "Déjà atteint, bravo !"
              : `Encore ${formatDecimal(nextProgress.remainingKg)} kg à ${nextProgress.direction}.`}
          </span>
        </p>
      )}
      <ul className="mt-2 divide-y divide-border">
        {goals.map((goal) => {
          const progress = goalProgress(goal, latest.weightKg, latest.heightCm);
          const past = goal.date <= today;
          return (
            <li key={goal.id} className="flex items-center gap-3 py-2">
              <FlagIcon className={`h-4 w-4 shrink-0 ${past ? "text-muted-foreground" : "text-primary"}`} />
              <div className="min-w-0 flex-1 text-sm">
                <p className={past ? "text-muted-foreground" : "text-foreground"}>
                  <span className="font-semibold tabular-nums">{formatDecimal(goal.weightKg)} kg</span> le{" "}
                  {formatDate(goal.date)}
                  {past && " · échéance passée"}
                </p>
                {!isNormalBmi(progress.goalBmi) && (
                  <p className="text-xs text-warning-text">
                    IMC visé {formatDecimal(progress.goalBmi)} ({progress.goalCategory.toLowerCase()}) : parlez-en à
                    votre médecin.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(goal.id)}
                aria-label={`Supprimer l'objectif du ${formatDate(goal.date)}`}
                className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Historique, plus récent en haut ; toucher une pesée ouvre son détail.
function History({ rows, onSelect }: { rows: imc.ImcRow[]; onSelect: (row: imc.ImcRow) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {[...rows].reverse().map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onSelect(row)}
            className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left active:bg-muted"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{formatDate(row.date)}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatDecimal(row.weightKg)} kg · {formatDecimal(row.heightCm)} cm
              </p>
            </div>
            <div className="text-right">
              <p className={`font-semibold tabular-nums ${isNormalBmi(row.bmi) ? "text-foreground" : TONE_TEXT[row.tone]}`}>
                IMC {formatDecimal(row.bmi)}
              </p>
              <TrendBadge row={row} />
            </div>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
