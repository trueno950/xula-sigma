import type { ColumnaDeTabla } from "@/shared/ui";
import type { CalleGuardada, LugarGuardado } from "../application/puertos";
import {
  type LugarId,
  type PuntoGeografico,
  puedeTenerCatalogoDeCalles,
} from "../domain";

export const COLUMNAS_DE_CALLES: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
  { clave: "ubicacion", etiqueta: "Ubicación" },
];

export const estadoDeUbicacion = (
  punto: PuntoGeografico | null,
): "Ubicada" | "Sin ubicar" => (punto ? "Ubicada" : "Sin ubicar");

export const destinosDeMovimiento = (
  lugarActualId: LugarId,
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[],
): readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[] =>
  lugares.filter(
    (lugar) =>
      lugar.id !== lugarActualId && puedeTenerCatalogoDeCalles(lugar.tipo),
  );

export type CalleParaPanel = Pick<
  CalleGuardada,
  "id" | "nombre" | "lugarId" | "punto"
>;
