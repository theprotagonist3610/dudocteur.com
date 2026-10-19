import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      pwaAssets: { config: true },
      manifest: {
        name: "LOD-Pro — Administration des Outils du Docteur",
        short_name: "LOD-Pro",
        description: "Supervision de l'application Les Outils du Docteur.",
        lang: "fr",
        theme_color: "#a41624",
        background_color: "#fffcf8",
        display: "standalone",
      },
    }),
  ],
  // .env.local unique à la racine du dépôt.
  envDir: "../..",
  server: { port: 5174, strictPort: true },
});
