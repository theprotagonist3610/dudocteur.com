import { ExclamationTriangleIcon, FireIcon, PlusIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { formatDecimal, poids } from "@lod/core";
import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../ui/forms";
import { Segmented } from "../../ui/Segmented";
import { useImcData } from "../imc/data";
import { NewEntrySheet } from "../imc/EntrySheets";
import { usePoidsData } from "./data";
import { MeasurementSheet } from "./MeasurementSheet";
import { RowDetailSheet } from "./RowDetailSheet";
import { FAT_LEVEL_TEXT } from "./tones";

const {
  ENERGY_NEEDS_TOOL_ID,
  FORMULA_LABELS,
  FORMULA_SHORT_LABELS,
  IDEAL_FAT_PERCENT,
  JAMES_MAX_BMI,
  LOW_FFMI,
  buildLeanMassRows,
  buildMeasurementRows,
  formatDate,
  formatInteger,
  kpiStatuses,
  leanMassComment,
} = poids;

// La courbe (et la bibliothèque de graphiques) n'est téléchargée qu'à l'ouverture de l'onglet.
const BmrChart = lazy(() => import("./BmrChart"));

const SEX_OPTIONS = [
  { id: "homme", label: "Homme" },
  { id: "femme", label: "Femme" },
] as const;

const MODE_OPTIONS = [
  { id: "estimatif", label: "Estimation" },
  { id: "manuel", label: "Mensurations" },
] as const;

const TABS = [
  { id: "historique", label: "Historique" },
  { id: "courbe", label: "Métabolisme" },
] as const;

export default function PoidsTool() {
  const { sex, mode, measurements, saved, setSex, setMode, saveMeasurement, removeMeasurement } = usePoidsData();
  const imcData = useImcData();
  const [sheet, setSheet] = useState<"pesee" | "mesures" | null>(null);
  const [detail, setDetail] = useState<poids.LeanMassRow | null>(null);

  // Estimatif : les pesées de l'IMC. Manuel : les mensurations de cet outil.
  const { rows, unusable } = useMemo(() => {
    if (!sex) return { rows: [], unusable: [] };
    return mode === "estimatif"
      ? { rows: buildLeanMassRows(imcData.entries, sex), unusable: [] }
      : buildMeasurementRows(measurements, imcData.entries, sex);
  }, [sex, mode, imcData.entries, measurements]);

  return (
    <div className="flex flex-col gap-5">
      {(!saved || !imcData.saved) && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Vos données n'ont pas pu être enregistrées sur ce téléphone (navigation privée ou mémoire pleine). Elles
          seront perdues à la fermeture de la page.
        </p>
      )}

      <section aria-label="Réglages" className="flex flex-col gap-3">
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Sexe</p>
          <Segmented label="Sexe" options={SEX_OPTIONS} value={sex} onChange={setSex} />
          <p className="mt-1 text-xs text-muted-foreground">Les formules diffèrent selon le sexe.</p>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Calcul</p>
          <Segmented label="Mode de calcul" options={MODE_OPTIONS} value={mode} onChange={setMode} />
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "estimatif"
              ? "À partir de votre poids et de votre taille (pesées de l'outil IMC)."
              : "À partir de vos mensurations : plus précis si vous mesurez toujours de la même façon."}
          </p>
        </div>
      </section>

      {sex === "femme" && (
        <p
          role="note"
          className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-text"
        >
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Enceinte ? La grossesse modifie le poids, les mensurations et la composition corporelle : ces calculs ne
          s'appliquent pas.
        </p>
      )}

      {mode === "estimatif" ? (
        <Button onClick={() => setSheet("pesee")}>
          <PlusIcon className="h-5 w-5" aria-hidden="true" />
          Nouvelle pesée
        </Button>
      ) : (
        <Button onClick={() => setSheet("mesures")} disabled={!sex}>
          <PlusIcon className="h-5 w-5" aria-hidden="true" />
          Ajouter des mesures
        </Button>
      )}

      {!sex ? (
        <p className="rounded-2xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
          Indiquez votre sexe pour voir votre composition corporelle.
        </p>
      ) : (
        <>
          <UnusableNotice unusable={unusable} sex={sex} onRemove={removeMeasurement} />
          {/* key : changer de mode repart sur l'onglet Historique (ce ne sont plus les mêmes prises). */}
          <Results key={mode} rows={rows} sex={sex} mode={mode} onSelect={setDetail} />
        </>
      )}

      <Link
        to={`/${ENERGY_NEEDS_TOOL_ID}`}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground active:bg-muted md:hover:border-primary/50"
      >
        <FireIcon className="h-4 w-4" aria-hidden="true" />
        Apprécier vos besoins énergétiques
      </Link>

      <p className="text-xs text-muted-foreground">
        {mode === "estimatif"
          ? `Estimations à partir du poids, de la taille et du sexe. La formule est choisie selon l'IMC de chaque pesée : James sous ${JAMES_MAX_BMI}, Boer à partir de ${JAMES_MAX_BMI} (en cas d'obésité, James sous-estime la masse maigre).`
          : `Masse grasse calculée avec la méthode de l'US Navy (cou, tour de taille${sex === "femme" ? ", tour de hanches" : ""} et taille). Masse maigre = poids − masse grasse.`}
      </p>

      <NewEntrySheet
        open={sheet === "pesee"}
        onClose={() => setSheet(null)}
        entries={imcData.entries}
        lastHeightCm={imcData.rows.at(-1)?.heightCm}
        onSave={imcData.saveEntry}
      />
      {sex && (
        <MeasurementSheet
          open={sheet === "mesures"}
          onClose={() => setSheet(null)}
          sex={sex}
          measurements={measurements}
          entries={imcData.entries}
          // Une seule saisie met à jour les deux outils : pesée du jour (IMC) et mensurations.
          onSave={(measurement, entry) => {
            if (entry) imcData.saveEntry(entry);
            saveMeasurement(measurement);
          }}
        />
      )}
      <RowDetailSheet
        row={detail}
        mode={mode}
        onClose={() => setDetail(null)}
        // Les pesées appartiennent à l'IMC : on ne supprime ici que les mensurations.
        onRemove={mode === "manuel" ? removeMeasurement : undefined}
      />
    </div>
  );
}

// Mensurations impossibles à calculer, avec la raison et la marche à suivre.
// Elles n'apparaissent pas dans l'historique (rien à calculer) : on permet de les supprimer ici.
function UnusableNotice({
  unusable,
  sex,
  onRemove,
}: {
  unusable: poids.UnusableMeasurement[];
  sex: poids.BiologicalSex;
  onRemove: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  if (unusable.length === 0) return null;
  const reasonText = (reason: poids.UnusableReason) =>
    reason === "pesee-manquante"
      ? "pas de pesée ce jour-là dans l'outil IMC"
      : sex === "femme"
        ? "tour de hanches manquant ou mesures incohérentes"
        : "mesures incohérentes";

  return (
    <section
      aria-label="Mensurations incalculables"
      className="rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-text"
    >
      <p>
        Ces mensurations ne peuvent pas être calculées. Ajoutez des mesures à la même date avec votre poids, ou
        supprimez-les.
      </p>
      <ul className="mt-2 divide-y divide-warning/30">
        {unusable.map(({ measurement, reason }) => (
          <li key={measurement.id} className="flex items-center gap-3 py-1">
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{formatDate(measurement.date)}</span> : {reasonText(reason)}
            </span>
            {confirming === measurement.id ? (
              <button
                type="button"
                onClick={() => onRemove(measurement.id)}
                className="h-11 shrink-0 rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground"
              >
                Confirmer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(measurement.id)}
                className="h-11 shrink-0 rounded-full px-3 text-sm font-semibold underline active:bg-warning/20"
              >
                Supprimer
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ResultsProps {
  rows: poids.LeanMassRow[];
  sex: poids.BiologicalSex;
  mode: poids.Mode;
  onSelect: (row: poids.LeanMassRow) => void;
}

function Results({ rows, sex, mode, onSelect }: ResultsProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("historique");
  const latest = rows.at(-1);

  if (!latest) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
        <p className="font-semibold text-foreground">
          {mode === "estimatif" ? "Aucune pesée pour l'instant" : "Aucune mesure pour l'instant"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "estimatif"
            ? "Ajoutez une pesée : elle sera aussi visible dans l'outil IMC. Vos données restent sur ce téléphone."
            : "Ajoutez vos mensurations : le guide vous explique comment bien les prendre."}
        </p>
      </div>
    );
  }

  return (
    <>
      <LatestSummary row={latest} sex={sex} />
      <section aria-label="Suivi">
        <Segmented kind="tab" label="Affichage" options={TABS} value={tab} onChange={setTab} />
        <div role="tabpanel" className="mt-4">
          {tab === "historique" ? (
            <History rows={rows} onSelect={onSelect} />
          ) : (
            <Suspense fallback={<p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>}>
              <BmrChart rows={rows} sex={sex} />
            </Suspense>
          )}
        </div>
      </section>
    </>
  );
}

// Code couleur des indicateurs : la couleur renforce le libellé écrit, elle n'est jamais seule.
const KPI_TILE: Record<poids.KpiTone, string> = {
  success: "border-success/40 bg-success/10",
  warning: "border-warning/50 bg-warning/10",
  danger: "border-destructive/40 bg-destructive/10",
};

const KPI_BADGE: Record<poids.KpiTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-text",
  danger: "bg-destructive/15 text-destructive",
};

const KPI_ICON: Record<poids.KpiTone, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  danger: ExclamationCircleIcon,
};

interface StatTileProps {
  label: string;
  value: string;
  unit: string;
  detail: string;
  status: poids.KpiStatus;
}

// Indicateur sur une ligne : libellé et explication à gauche, valeur et statut à droite.
function StatTile({ label, value, unit, detail, status }: StatTileProps) {
  const Icon = KPI_ICON[status.tone];
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${KPI_TILE[status.tone]}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="text-xl font-semibold text-foreground tabular-nums">
          {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
        </p>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${KPI_BADGE[status.tone]}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {status.label}
        </span>
      </div>
    </div>
  );
}

function LatestSummary({ row, sex }: { row: poids.LeanMassRow; sex: poids.BiologicalSex }) {
  const statuses = kpiStatuses(row);
  const low = row.level === "basse";
  return (
    <section aria-label="Dernière prise" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Le <span className="font-semibold text-foreground">{formatDate(row.date)}</span> :{" "}
        {formatDecimal(row.weightKg)} kg pour {formatDecimal(row.heightCm)} cm
      </p>
      <StatTile
        label="Masse maigre"
        value={formatDecimal(row.leanMassKg)}
        unit="kg"
        detail={`Formule de ${FORMULA_LABELS[row.formula]}, IMC ${formatDecimal(row.bmi)}`}
        status={statuses.leanMass}
      />
      <StatTile
        label="Masse grasse"
        value={formatDecimal(row.fatPercent)}
        unit="%"
        detail={`${formatDecimal(row.fatMassKg)} kg · idéale entre ${IDEAL_FAT_PERCENT[sex].min} et ${IDEAL_FAT_PERCENT[sex].max} %`}
        status={statuses.fat}
      />
      <StatTile
        label="Indice de masse maigre"
        value={formatDecimal(row.ffmi)}
        unit="kg/m²"
        detail={`Bas en dessous de ${LOW_FFMI[sex]} (ESPEN)`}
        status={statuses.ffmi}
      />
      <StatTile
        label="Métabolisme de base"
        value={formatInteger(row.bmrKcal)}
        unit="kcal/j"
        detail={`Katch-McArdle · normale à ce poids : ${formatInteger(row.referenceBmrKcal)} kcal/j`}
        status={statuses.bmr}
      />
      <p
        role="status"
        className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          low ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"
        }`}
      >
        {leanMassComment(row, sex)}
      </p>
    </section>
  );
}

// Historique, plus récent en haut ; toucher une prise ouvre son détail.
function History({ rows, onSelect }: { rows: poids.LeanMassRow[]; onSelect: (row: poids.LeanMassRow) => void }) {
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
                {formatDecimal(row.weightKg)} kg · {FORMULA_SHORT_LABELS[row.formula]}
              </p>
            </div>
            <div className="text-right text-sm tabular-nums">
              <p className="font-semibold text-foreground">Maigre {formatDecimal(row.leanMassKg)} kg</p>
              <p className={`font-medium ${FAT_LEVEL_TEXT[row.fatLevel]}`}>
                Graisse {formatDecimal(row.fatPercent)} %
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

