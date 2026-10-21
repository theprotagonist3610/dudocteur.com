import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "@heroicons/react/24/outline";
import { imc } from "@lod/core";
import { ASSESSMENT_TEXT } from "./tones";

const { formatSigned } = imc;

// Évolution de l'IMC depuis la pesée précédente, colorée selon son effet (favorable ou non).
export function TrendBadge({ row }: { row: imc.ImcRow }) {
  if (row.trend === "premiere" || row.bmiDelta === null) {
    return <span className="text-xs text-muted-foreground">1re pesée</span>;
  }
  const Icon = row.trend === "hausse" ? ArrowUpRightIcon : row.trend === "baisse" ? ArrowDownRightIcon : MinusIcon;
  const label = row.trend === "hausse" ? "En hausse" : row.trend === "baisse" ? "En baisse" : "Stable";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${ASSESSMENT_TEXT[row.assessment]}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label} : </span>
      {formatSigned(row.bmiDelta)}
    </span>
  );
}
