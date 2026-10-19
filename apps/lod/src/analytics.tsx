/*
  Mesure d'audience (Vercel Web Analytics) : pages vues uniquement, sans cookie.
  Chaque outil ayant son URL (/imc, /tension…), une page vue = un outil consulté.

  Règle : rien de ce que l'utilisateur saisit ne doit partir dans l'analytics
  (ce sont des données de santé). beforeSend ne garde donc que le chemin de la
  page : paramètres d'URL et ancre sont retirés.
*/
import { Analytics as VercelAnalytics, type BeforeSend } from "@vercel/analytics/react";

const pathOnly: BeforeSend = (event) => {
  const url = new URL(event.url);
  return { ...event, url: url.origin + url.pathname };
};

export function Analytics() {
  // En développement, les événements sont affichés dans la console au lieu d'être envoyés.
  return <VercelAnalytics mode={import.meta.env.DEV ? "development" : "production"} beforeSend={pathOnly} />;
}
