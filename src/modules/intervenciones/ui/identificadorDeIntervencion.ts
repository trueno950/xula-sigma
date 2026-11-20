import type { IntervencionId } from "../domain";

const LARGO_DEL_PREFIJO = 4;

/**
 * El identificador visible de una intervencion: `INT-` y los primeros cuatro
 * caracteres hexadecimales de su `id`, en mayusculas (`INT-3F1C`).
 *
 * No es un folio: el modulo no tiene serie, y un consecutivo por municipio
 * -regla 7 de `AGENTS.md`- seria una tarea aparte (`odd/tasks/intervenciones-ux.md`,
 * L4). Es el prefijo de un `id` que ya existe, asi que no pide columna,
 * secuencia ni migracion, y no cambia entre pantallas ni entre visitas: es lo
 * que hace que dos obras del mismo tipo y el mismo lugar se distingan.
 */
export const identificadorDeIntervencion = (id: IntervencionId): string =>
  `INT-${id.slice(0, LARGO_DEL_PREFIJO).toUpperCase()}`;
