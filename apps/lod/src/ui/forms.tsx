import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  suffix?: string; // unité affichée dans le champ (kg, cm…)
}

/*
  Champ de formulaire pour le téléphone : 48 px de haut, texte en 16 px (en
  dessous, Safari zoome sur le champ), erreur reliée au champ pour les lecteurs
  d'écran. Pour un nombre, utiliser type="text" + inputMode="decimal" : le clavier
  numérique s'ouvre et la virgule française est acceptée (voir parseDecimal).
*/
export function Field({ id, label, error, hint, suffix, ...input }: FieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:ring-2 focus:ring-ring focus:outline-none aria-invalid:border-destructive ${
            suffix ? "pr-12" : ""
          }`}
          {...input}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" };

const VARIANTS = {
  primary: "bg-primary text-primary-foreground active:bg-primary-hover md:hover:bg-primary-hover",
  secondary: "border border-border bg-surface text-foreground active:bg-muted md:hover:border-primary/50",
  danger: "bg-destructive text-destructive-foreground active:opacity-90",
} as const;

// Bouton pleine largeur de 48 px : la cible tactile principale d'un écran.
export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
