// Sélecteur en pastilles pleine largeur : un choix parmi 2 ou 3, cibles de 40 px.
// kind="radio" pour un réglage (sexe, mode), kind="tab" pour changer d'affichage.
interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  kind?: "radio" | "tab";
}

export function Segmented<T extends string>({ label, options, value, onChange, kind = "radio" }: SegmentedProps<T>) {
  return (
    <div
      role={kind === "tab" ? "tablist" : "radiogroup"}
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col rounded-full bg-muted p-1"
    >
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role={kind}
            {...(kind === "tab" ? { "aria-selected": selected } : { "aria-checked": selected })}
            onClick={() => onChange(option.id)}
            className={`h-10 rounded-full px-3 text-sm font-semibold transition ${
              selected ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
