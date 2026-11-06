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

/**
 * Donde abre el mapa de una calle sin punto: el promedio de las calles del
 * mismo lugar que ya lo tienen. Los lugares no guardan coordenadas propias.
 */
export const centroDeCalles = (
  calles: readonly Pick<CalleGuardada, "punto">[],
): PuntoGeografico | null => {
  const puntos = calles.flatMap((calle) => (calle.punto ? [calle.punto] : []));
  if (puntos.length === 0) return null;

  const suma = (eje: keyof PuntoGeografico) =>
    puntos.reduce((total, punto) => total + punto[eje], 0) / puntos.length;
  return { latitud: suma("latitud"), longitud: suma("longitud") };
};

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
