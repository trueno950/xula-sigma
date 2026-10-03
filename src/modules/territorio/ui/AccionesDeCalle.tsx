import {
  ArrowsOutCardinal,
  MapPin,
  PencilSimple,
  Prohibit,
} from "@phosphor-icons/react/ssr";
import type { ComponentProps, ComponentType } from "react";
import { EnlaceDeAccion } from "@/shared/ui";
import type { CalleId, LugarId } from "../domain";
import { rutaDe } from "./contenido";
import type { AccionDeNodo } from "./PanelDeNodo";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";

export type AccionDeCalle = Extract<
  AccionDeNodo,
  "ubicarCalle" | "renombrarCalle" | "reparentearCalle" | "bajaCalle"
>;

type Variante = ComponentProps<typeof EnlaceDeAccion>["variante"];

type IconoDeAccion = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

type ItemDeAccion = {
  accion: AccionDeCalle;
  etiqueta: string;
  Icono: IconoDeAccion;
  variante?: Variante;
};

const ACCIONES: readonly ItemDeAccion[] = [
  {
    accion: "ubicarCalle",
    etiqueta: "Ubicar en el mapa",
    Icono: MapPin,
    variante: "primaria",
  },
  { accion: "renombrarCalle", etiqueta: "Renombrar", Icono: PencilSimple },
  {
    accion: "reparentearCalle",
    etiqueta: "Mover a otro lugar",
    Icono: ArrowsOutCardinal,
  },
  {
    accion: "bajaCalle",
    etiqueta: "Dar de baja",
    Icono: Prohibit,
    variante: "peligro",
  },
];

export const esAccionDeCalle = (
  accion: AccionDeNodo | undefined,
): accion is AccionDeCalle => ACCIONES.some((item) => item.accion === accion);

export function AccionesDeCalle({
  raizId,
  nodoId,
  calleId,
  permisos,
  accionAbierta,
}: {
  raizId: LugarId;
  nodoId: LugarId;
  calleId: CalleId;
  permisos: PermisosDeTerritorio;
  accionAbierta?: AccionDeCalle | undefined;
}) {
  return (
    <>
      {ACCIONES.filter(
        (item) =>
          puedeAbrir(item.accion, permisos) &&
          !(item.variante === "peligro" && item.accion === accionAbierta),
      ).map((item) => (
        <EnlaceDeAccion
          key={item.accion}
          href={rutaDe({
            raizId,
            nodoId,
            vista: "calles",
            calleId,
            accion: item.accion,
          })}
          {...(item.variante ? { variante: item.variante } : {})}
        >
          <item.Icono size={18} aria-hidden />
          {item.etiqueta}
        </EnlaceDeAccion>
      ))}
    </>
  );
}
