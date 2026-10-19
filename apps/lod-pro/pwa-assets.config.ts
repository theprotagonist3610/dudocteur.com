import { defineConfig, minimal2023Preset as preset } from "@vite-pwa/assets-generator/config";

// Icônes PWA générées au build à partir du favicon, sur le fond crème de la charte.
// Provisoire : le favicon est horizontal (il est réduit pour tenir dans le carré) ;
// il faudra une icône carrée avant le lancement.
const background = "#ffe8c9";

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...preset,
    transparent: { ...preset.transparent, resizeOptions: { fit: "contain" } },
    maskable: { ...preset.maskable, resizeOptions: { fit: "contain", background } },
    apple: { ...preset.apple, resizeOptions: { fit: "contain", background } },
  },
  images: ["public/favicon.png"],
});
