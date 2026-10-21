import { defineConfig } from "vitest/config";

// Config de test séparée de vite.config.ts (pas de PWA ni de Tailwind pendant les tests).
export default defineConfig({
  test: {
    environment: "happy-dom",
  },
});
