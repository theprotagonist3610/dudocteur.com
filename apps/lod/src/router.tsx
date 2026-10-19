import { createBrowserRouter } from "react-router";
import { Layout } from "./Layout";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ToolPage } from "./pages/ToolPage";

// Une URL par outil (/imc, /tension…) : chaque outil est mesurable dans
// l'analytics et référençable par les moteurs de recherche.
export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: ":toolId", Component: ToolPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
