import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { dark as darkPalette, light as lightPalette, THEME_STORAGE_KEY } from "@lod/theme";
import { useState } from "react";

const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

export function ThemeToggle() {
  const [dark, setDark] = useState(isDark);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    // Barre du navigateur assortie à l'en-tête.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", (next === "dark" ? darkPalette : lightPalette).surface);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour la session.
    }
    setDark(!dark);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Activer le thème clair" : "Activer le thème sombre"}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground active:bg-muted md:hover:bg-muted"
    >
      {dark ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
    </button>
  );
}
