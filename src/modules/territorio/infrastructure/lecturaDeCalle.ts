import type { CalleGuardada } from "../application/puertos";
import { comoCalleId, comoLugarId } from "../domain";
import { calles } from "./esquema";

/**
 * Proyeccion de lectura de `calles` compartida por el repositorio de
 * escritura y el lector del mapa: una sola lista de columnas y un solo
 * mapper evitan que la ficha y el mapa devuelvan formas distintas.
 */
export const columnasDeLecturaDeCalle = {
  id: calles.id,
  nombre: calles.nombre,
  lugarId: calles.lugarId,
  latitud: calles.latitud,
  longitud: calles.longitud,
  bajaEn: calles.bajaEn,
};

export type FilaDeCalle = {
  id: string;
  nombre: string;
  lugarId: string;
  latitud: number | null;
  longitud: number | null;
  bajaEn: Date | null;
};

export const aCalleGuardada = (fila: FilaDeCalle): CalleGuardada => ({
  ...fila,
  id: comoCalleId(fila.id),
  lugarId: comoLugarId(fila.lugarId),
  punto:
    fila.latitud === null || fila.longitud === null
      ? null
      : { latitud: fila.latitud, longitud: fila.longitud },
});
