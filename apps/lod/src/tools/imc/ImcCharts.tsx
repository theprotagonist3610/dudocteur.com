/*
  Courbes de l'IMC, chargées seulement à l'ouverture de l'onglet (Recharts est lourd).

  Poids (kg), taille (cm) et IMC n'ont pas la même échelle : plutôt qu'un seul
  graphique à plusieurs axes (trompeur), trois petits graphiques empilés
  partagent le même axe du temps et un curseur synchronisé sur la date.
  Au doigt : toucher la courbe affiche la valeur du jour le plus proche.
*/
import { formatDecimal, imc } from "@lod/core";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TONE_BOX, TONE_FILL, TONE_TEXT } from "./tones";

const { BMI_BANDS, constantHeightCm, formatDate, formatShortDate, idealWeightKg, niceTicks, toIsoLocal } = imc;

const toTime = (iso: string) => new Date(`${iso}T00:00:00`).getTime();

// Un point du graphique : une pesée et/ou un objectif à cette date.
interface ChartPoint {
  t: number; // date en millisecondes, pour un axe du temps proportionnel
  date: string;
  row?: imc.ImcRow; // pesée
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  goalKg?: number; // objectif à cette date
  pathKg?: number; // trajectoire visée : dernière pesée puis objectifs à venir
  pastGoalKg?: number; // objectif dont l'échéance est passée (repère seul)
}

type SeriesKey = "weightKg" | "heightCm" | "bmi";

interface SeriesConfig {
  key: SeriesKey;
  title: string;
  unit: string;
  // Marge ajoutée autour des valeurs pour que la courbe ne colle pas aux bords.
  padding: number;
  height: string; // hauteur de la zone de tracé (classe Tailwind)
}

const SERIES: SeriesConfig[] = [
  { key: "weightKg", title: "Poids", unit: "kg", padding: 1, height: "h-48" },
  { key: "heightCm", title: "Taille", unit: "cm", padding: 2, height: "h-32" },
  { key: "bmi", title: "IMC", unit: "", padding: 1, height: "h-60" },
];

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };

const withUnit = (value: number, unit: string) => (unit ? `${formatDecimal(value)} ${unit}` : formatDecimal(value));

// Fenêtre minimale de l'axe de l'IMC : de quoi montrer un peu de chaque bande.
const BMI_VIEW = { min: 16, max: 33 } as const;

// Échelle de l'axe vertical selon la série.
function yScale(series: SeriesConfig, values: number[], idealWeight: number) {
  let min = Math.min(...values) - series.padding;
  let max = Math.max(...values) + series.padding;

  if (series.key === "weightKg") {
    // La ligne du poids idéal reste toujours visible, même loin des mesures.
    min = Math.min(min, idealWeight - series.padding);
    max = Math.max(max, idealWeight + series.padding);
    return niceTicks(min, max, 5);
  }

  if (series.key === "bmi") {
    // Les 4 bandes (maigre, normal, surpoids, obésité) restent toujours visibles.
    const lo = Math.floor(Math.min(min, BMI_VIEW.min));
    const hi = Math.ceil(Math.max(max, BMI_VIEW.max));
    const thresholds = BMI_BANDS.slice(1).map((band) => band.min);
    const ticks = [lo, ...thresholds, hi].filter((v, i, all) => all.indexOf(v) === i).sort((a, b) => a - b);
    return { domain: [lo, hi] as [number, number], ticks };
  }

  return niceTicks(min, max, 5);
}

// Fusionne pesées et objectifs en points datés (une date = un point).
function buildChartPoints(rows: imc.ImcRow[], goals: imc.ImcGoal[]): ChartPoint[] {
  const byDate = new Map<string, ChartPoint>();
  const at = (date: string) => {
    const point = byDate.get(date) ?? { t: toTime(date), date };
    byDate.set(date, point);
    return point;
  };
  for (const row of rows) {
    Object.assign(at(row.date), { row, weightKg: row.weightKg, heightCm: row.heightCm, bmi: row.bmi });
  }
  const latest = rows.at(-1);
  const upcoming = latest ? goals.filter((g) => g.date > latest.date) : [];
  if (latest && upcoming.length > 0) at(latest.date).pathKg = latest.weightKg;
  for (const goal of goals) {
    const point = at(goal.date);
    point.goalKg = goal.weightKg;
    if (upcoming.includes(goal)) point.pathKg = goal.weightKg;
    else point.pastGoalKg = goal.weightKg;
  }
  return [...byDate.values()].sort((a, b) => a.t - b.t);
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  series: SeriesConfig;
}

// Infobulle : date, valeur et objectif éventuel du point touché.
function ChartTooltip({ active, payload, series }: ChartTooltipProps) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  const value = point[series.key];
  const goal = series.key === "weightKg" ? point.goalKg : undefined;
  if (value === undefined && goal === undefined) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-muted-foreground">{formatDate(point.date)}</p>
      {value !== undefined && <p className="font-semibold text-foreground tabular-nums">{withUnit(value, series.unit)}</p>}
      {series.key === "bmi" && point.row && <p className="text-xs text-muted-foreground">{point.row.category}</p>}
      {goal !== undefined && (
        <p className="text-xs text-muted-foreground">
          Objectif : <span className="font-semibold text-foreground">{formatDecimal(goal)} kg</span>
        </p>
      )}
    </div>
  );
}

// Repère d'objectif : rond creux, dessiné seulement aux dates d'objectif.
function goalDot(color: string) {
  return function GoalDot(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) {
    const { cx, cy, payload, index } = props;
    if (cx === undefined || cy === undefined || payload?.goalKg === undefined) return <g key={index} />;
    return <circle key={index} cx={cx} cy={cy} r={5} fill="var(--surface)" stroke={color} strokeWidth={2} />;
  };
}

interface SeriesPanelProps {
  series: SeriesConfig;
  data: ChartPoint[];
  xDomain: [number, number];
  showXAxis: boolean;
  hasGoals: boolean;
}

function SeriesPanel({ series, data, xDomain, showXAxis, hasGoals }: SeriesPanelProps) {
  const measured = data.filter((d) => d[series.key] !== undefined);
  const lastMeasured = measured.at(-1);
  const lastValue = lastMeasured?.[series.key];
  const lastMeasuredIndex = lastMeasured ? data.indexOf(lastMeasured) : -1;
  const idealWeight = idealWeightKg(lastMeasured?.heightCm ?? 170);
  const goalValues = series.key === "weightKg" ? data.flatMap((d) => (d.goalKg === undefined ? [] : [d.goalKg])) : [];
  const yAxis = yScale(series, [...measured.map((d) => d[series.key] as number), ...goalValues], idealWeight);
  const [lo, hi] = yAxis.domain;
  const showGoals = series.key === "weightKg" && hasGoals;

  return (
    <figure className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-3">
      <figcaption className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-sm font-semibold text-foreground">
          {series.title}
          {series.unit && <span className="font-normal text-muted-foreground"> ({series.unit})</span>}
        </span>
        {lastValue !== undefined && (
          <span className="text-xs text-muted-foreground">
            Dernière : <span className="font-semibold text-foreground">{withUnit(lastValue, series.unit)}</span>
          </span>
        )}
      </figcaption>
      {showGoals && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground" aria-label="Légende">
          <li className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded bg-primary" aria-hidden="true" />
            Mesuré
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-foreground/60" aria-hidden="true" />
            Trajectoire visée
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-foreground/60 bg-surface" aria-hidden="true" />
            Objectif
          </li>
        </ul>
      )}
      <div className={series.height}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="imc" syncMethod="value" margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            {series.key === "bmi" &&
              BMI_BANDS.map((band) => (
                <ReferenceArea
                  key={band.label}
                  y1={Math.max(band.min, lo)}
                  y2={Math.min(band.max, hi)}
                  fill={TONE_FILL[band.tone]}
                  fillOpacity={0.12}
                  stroke="none"
                  label={{ value: band.label, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 10 }}
                />
              ))}
            {series.key === "weightKg" && (
              <ReferenceLine
                y={idealWeight}
                stroke="var(--success)"
                strokeWidth={1.5}
                label={{
                  value: `Poids idéal ${formatDecimal(idealWeight)} kg`,
                  position: "insideBottomLeft",
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                }}
              />
            )}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={xDomain}
              hide={!showXAxis}
              tickFormatter={(t: number) => formatShortDate(toIsoLocal(new Date(t)))}
              tick={AXIS_TICK}
              stroke="var(--border)"
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={yAxis.domain}
              ticks={yAxis.ticks}
              tick={AXIS_TICK}
              tickFormatter={(v: number) => formatDecimal(v)}
              stroke="var(--border)"
              tickLine={false}
              axisLine={false}
              width={34}
            />
            <Tooltip
              content={({ active, payload }) => <ChartTooltip active={active} payload={payload} series={series} />}
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            />
            {showGoals && (
              <Line
                dataKey="pathKg"
                stroke="var(--foreground)"
                strokeOpacity={0.6}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                connectNulls
                dot={goalDot("var(--foreground)")}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            {showGoals && (
              <Line
                dataKey="pastGoalKg"
                stroke="none"
                dot={goalDot("var(--muted-foreground)")}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey={series.key}
              stroke="var(--primary)"
              strokeWidth={2}
              connectNulls
              dot={{ r: 3.5, fill: "var(--primary)", stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            >
              {/* Étiquette directe sélective : seulement la dernière valeur mesurée. */}
              <LabelList
                dataKey={series.key}
                content={({ x, y, value, index }) =>
                  index === lastMeasuredIndex && typeof value === "number" ? (
                    <text x={Number(x) + 6} y={Number(y) - 8} fill="var(--foreground)" fontSize={11} fontWeight={600}>
                      {formatDecimal(value)}
                    </text>
                  ) : null
                }
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export default function ImcCharts({ rows, goals }: { rows: imc.ImcRow[]; goals: imc.ImcGoal[] }) {
  const latest = rows.at(-1);
  if (rows.length < 2 || !latest) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
        Ajoutez au moins deux pesées pour voir votre évolution.
      </p>
    );
  }
  const data = buildChartPoints(rows, goals);
  // Axe du temps commun aux trois graphiques, prolongé jusqu'au dernier objectif.
  const xDomain: [number, number] = [data[0]?.t ?? 0, data.at(-1)?.t ?? 0];
  // Taille inchangée (adulte, en général) : une phrase suffit, une courbe plate n'apprendrait rien.
  const constantHeight = constantHeightCm(rows);
  return (
    <div className="flex flex-col gap-3">
      {SERIES.map((series, i) =>
        series.key === "heightCm" && constantHeight !== null ? (
          <p key={series.key} className="rounded-2xl bg-muted px-4 py-3 text-sm text-foreground">
            Votre taille est constante : <span className="font-semibold">{formatDecimal(constantHeight)} cm</span>.
          </p>
        ) : (
          <SeriesPanel
            key={series.key}
            series={series}
            data={data}
            xDomain={xDomain}
            showXAxis={series.key === "bmi" || i === SERIES.length - 1}
            hasGoals={goals.length > 0}
          />
        ),
      )}
      <div className={`rounded-xl border px-4 py-3 ${TONE_BOX[latest.tone]}`} role="status">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Votre situation au {formatDate(latest.date)}
        </p>
        <p className={`mt-1 text-sm font-medium ${TONE_TEXT[latest.tone]}`}>{latest.comment}</p>
      </div>
    </div>
  );
}
