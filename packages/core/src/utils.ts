// Aides communes aux outils : dates, saisie au clavier, mise en forme française.

// Date AAAA-MM-JJ dans le fuseau de l'utilisateur (toISOString donnerait la date UTC,
// décalée d'un jour autour de minuit selon le fuseau).
export function toIsoLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayIso = () => toIsoLocal(new Date());

export const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIsoLocal(d);
};

export const isIsoDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const sortByDate = <T extends { date: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.date.localeCompare(b.date));

// Nombre de jours entre deux dates AAAA-MM-JJ (positif si `to` est après `from`).
export function daysBetween(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

export const toTime = (iso: string) => new Date(`${iso}T00:00:00`).getTime();

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export const formatShortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export const formatInteger = (n: number) => n.toLocaleString("fr-FR");

export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

export const newId = (prefix: string, date: string) => `${prefix}-${date}-${Date.now().toString(36)}`;

// Nombre saisi au clavier, avec virgule ou point décimal (« 76,5 » comme « 76.5 ») ; NaN si invalide.
export function parseDecimal(text: string): number {
  const normalized = text.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export interface Range {
  min: number;
  max: number;
}

export const inRange = (n: number, range: Range) => n >= range.min && n <= range.max;

// Erreurs d'un formulaire, par champ ; "form" pour une erreur qui concerne l'ensemble.
export type InputErrors<T> = Partial<Record<keyof T | "form", string>>;
