import type { CalleGuardada, LugarGuardado } from "../application/puertos";
import type { LugarId, PuntoGeografico } from "../domain";

export const formatoDePunto = (punto: PuntoGeografico | null): string =>
  punto
    ? `${punto.latitud.toFixed(6)}, ${punto.longitud.toFixed(6)}`
    : "Sin punto";

export const destinosDeMovimiento = (
  lugarActualId: LugarId,
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[],
): readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[] =>
  lugares.filter((lugar) => lugar.id !== lugarActualId);

export type CalleParaPanel = Pick<
  CalleGuardada,
  "id" | "nombre" | "lugarId" | "punto"
>;
