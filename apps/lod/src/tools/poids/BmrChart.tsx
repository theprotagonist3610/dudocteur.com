// Courbe du métabolisme de base, chargée seulement à l'ouverture de l'onglet (Recharts est lourd).
import { formatDecimal, poids } from "@lod/core";
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const { IDEAL_FAT_PERCENT, formatDate, formatInteger, formatShortDate, toIsoLocal, toTime } = poids;

interface BmrPoint {
  t: number;
  date: string;
  user: number;
  reference: number;
}

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };

// Couleurs : la courbe normale en bleu (référence), celle de l'utilisateur dans la couleur de la marque.
const BMR_SERIES = [
  { key: "reference", label: "Normale (masse grasse idéale)", color: "var(--chart-reference)" },
  { key: "user", label: "Vous", color: "var(--primary)" },
] as const;

function BmrTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const point = payload?.[0]?.payload as BmrPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-muted-foreground">{formatDate(point.date)}</p>
      {BMR_SERIES.map((series) => (
        <p key={series.key} className="flex items-center gap-2 text-foreground tabular-nums">
          <span className="h-0.5 w-4 rounded" style={{ background: series.color }} aria-hidden="true" />
          {series.key === "user" ? "Vous" : "Normale"} :{" "}
          <span className="font-semibold">{formatInteger(point[series.key])} kcal</span>
        </p>
      ))}
    </div>
  );
}

export default function BmrChart({ rows, sex }: { rows: poids.LeanMassRow[]; sex: poids.BiologicalSex }) {
  const latest = rows.at(-1);
  if (rows.length < 2 || !latest) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
        Ajoutez au moins deux prises pour voir l'évolution de votre métabolisme de base.
      </p>
    );
  }
  const data: BmrPoint[] = rows.map((r) => ({
    t: toTime(r.date),
    date: r.date,
    user: r.bmrKcal,
    reference: r.referenceBmrKcal,
  }));
  const values = data.flatMap((d) => [d.user, d.reference]);
  const step = 50;
  const domain: [number, number] = [
    Math.floor((Math.min(...values) - step) / step) * step,
    Math.ceil((Math.max(...values) + step) / step) * step,
  ];
  const lastIndex = data.length - 1;
  const gap = latest.bmrKcal - latest.referenceBmrKcal;
  const { min, max } = IDEAL_FAT_PERCENT[sex];

  return (
    <figure className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
      <figcaption className="flex flex-col gap-1 px-1">
        <span className="text-sm font-semibold text-foreground">
          Métabolisme de base <span className="font-normal text-muted-foreground">(kcal/jour)</span>
        </span>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Légende">
          {BMR_SERIES.map((series) => (
            <li key={series.key} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 rounded" style={{ background: series.color }} aria-hidden="true" />
              {series.label}
            </li>
          ))}
        </ul>
      </figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 40, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) => formatShortDate(toIsoLocal(new Date(t)))}
              tick={AXIS_TICK}
              stroke="var(--border)"
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={domain}
              allowDecimals={false}
              tick={AXIS_TICK}
              tickFormatter={(v: number) => formatInteger(v)}
              stroke="var(--border)"
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={({ active, payload }) => <BmrTooltip active={active} payload={payload} />}
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            />
            {BMR_SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2}
                dot={{ r: 3.5, fill: series.color, stroke: "var(--surface)", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: series.color, stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              >
                {/* Étiquette directe sélective : la dernière valeur de chaque courbe. */}
                <LabelList
                  dataKey={series.key}
                  content={({ x, y, value, index }) =>
                    index === lastIndex && typeof value === "number" ? (
                      <text x={Number(x) + 6} y={Number(y) + 4} fill="var(--foreground)" fontSize={11} fontWeight={600}>
                        {formatInteger(value)}
                      </text>
                    ) : null
                  }
                />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="px-1 text-sm text-foreground">
        {gap < 0
          ? `Votre métabolisme de base est inférieur de ${formatInteger(-gap)} kcal/jour à celui d'une personne de même poids avec une masse grasse idéale.`
          : gap > 0
            ? `Votre métabolisme de base dépasse de ${formatInteger(gap)} kcal/jour celui d'une personne de même poids avec une masse grasse idéale.`
            : "Votre métabolisme de base correspond à celui d'une personne de même poids avec une masse grasse idéale."}
      </p>
      <p className="px-1 text-xs text-muted-foreground">
        Courbe normale : métabolisme de base d'une personne du même poids dont la masse grasse serait idéale (
        {formatDecimal((min + max) / 2)} %, milieu de la fourchette {min}–{max} %).
      </p>
    </figure>
  );
}
