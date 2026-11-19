import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, LugarId } from "../domain";

/**
 * Lo que la pestana Calles sabe de cada calle ademas de su nombre (S8 de
 * `odd/tasks/territorio-ux.md`): la zona activa que la contiene y cuantos
 * domicilios vivos la usan como calle.
 *
 * `zona` es `null` cuando no cuelga de ninguna, y la pantalla lo escribe
 * «Sin zona»: una celda en blanco se lee como un dato que falta y no como
 * el hecho de que la calle quedo fuera de toda zona.
 */
export type DetalleDeCalle = {
  calleId: CalleId;
  zona: string | null;
  domicilios: number;
};

/**
 * Lado de lectura de esos detalles: el catalogo entero de un asentamiento
 * en una sola consulta, nunca una por calle. Es el mismo criterio de
 * `LectorDeContenidoDeLugares` y el motivo por el que esto no vive en
 * `RepositorioDeCalles.listarPorLugar`: esa lectura alimenta los selectores
 * de los formularios y no tiene por que pagar un agregado que solo mira la
 * tabla de la pestana.
 */
export type LectorDeDetallesDeCalles = {
  detallesPorLugar(
    tx: TransaccionTenant,
    lugarId: LugarId,
  ): Promise<readonly DetalleDeCalle[]>;
};
