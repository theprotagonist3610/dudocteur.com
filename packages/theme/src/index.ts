/*
  Jetons de couleur de la charte graphique dudocteur (voir README, section Thème).
  Source pour React Native ; theme.css en est la copie pour Tailwind (web).
  Un test vérifie que les deux restent identiques : modifier les deux ensemble.
*/

export const BRAND = {
  cream: "#ffe8c9",
  red: "#a41624",
  lightOrange: "#ffb564",
  burntOrange: "#d9571d",
} as const;

export type ColorToken =
  | "background"
  | "surface"
  | "surface-alt"
  | "foreground"
  | "muted"
  | "muted-foreground"
  | "border"
  | "primary"
  | "primary-hover"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "accent"
  | "accent-foreground"
  | "success"
  | "success-foreground"
  | "warning"
  | "warning-foreground"
  | "warning-text"
  | "chart-reference"
  | "destructive"
  | "destructive-foreground"
  | "ring";

export type Palette = Record<ColorToken, string>;

export const light: Palette = {
  background: "#fffcf8",
  surface: "#ffffff",
  "surface-alt": BRAND.cream,
  foreground: "#2a1210",
  muted: "#f5e9dc",
  "muted-foreground": "#6b5b52",
  border: "#f0d9be",
  primary: BRAND.red,
  "primary-hover": "#8a121f",
  "primary-foreground": "#ffffff",
  secondary: BRAND.burntOrange,
  "secondary-foreground": "#ffffff",
  accent: BRAND.lightOrange,
  "accent-foreground": "#451a03",
  success: "#15803d",
  "success-foreground": "#ffffff",
  warning: "#d97706",
  "warning-foreground": "#ffffff",
  "warning-text": "#b45309", // orange lisible en texte sur fond clair (contraste ≥ 4,5:1)
  "chart-reference": "#2563eb", // courbes de référence (« normale ») des graphiques
  destructive: "#dc2626",
  "destructive-foreground": "#ffffff",
  ring: BRAND.red,
};

export const dark: Palette = {
  background: "#1b1210",
  surface: "#241714",
  "surface-alt": "#3a2318",
  foreground: "#fdecd8",
  muted: "#3a2a22",
  "muted-foreground": "#c9b3a3",
  border: "#4a342a",
  primary: "#e5495a",
  "primary-hover": "#f06478",
  "primary-foreground": "#ffffff",
  secondary: "#ff8a4d",
  "secondary-foreground": "#241714",
  accent: BRAND.lightOrange,
  "accent-foreground": "#2a1210",
  success: "#4ade80",
  "success-foreground": "#052e13",
  warning: "#fbbf24",
  "warning-foreground": "#1c1204",
  "warning-text": "#fbbf24",
  "chart-reference": "#3b82f6",
  destructive: "#f87171",
  "destructive-foreground": "#1c0a0a",
  ring: "#e5495a",
};

export const palettes = { light, dark } as const;

// Rayon par défaut (0.75rem à 16 px).
export const RADIUS = 12;

// Titres et texte en Poppins, en attendant une solution pour Quartzo et Gilroy.
export const FONT_FAMILY = "Poppins";

// Clé localStorage du choix clair/sombre sur le web.
export const THEME_STORAGE_KEY = "lod-theme";
