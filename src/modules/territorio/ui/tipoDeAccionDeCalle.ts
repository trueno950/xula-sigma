import type { AccionDeNodo } from "./PanelDeNodo";

export type AccionDeCalle = Extract<
  AccionDeNodo,
  "ubicarCalle" | "renombrarCalle" | "reparentearCalle" | "bajaCalle"
>;
