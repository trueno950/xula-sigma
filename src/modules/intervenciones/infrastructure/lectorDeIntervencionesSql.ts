import { and, desc, eq } from "drizzle-orm";
import type { LectorDeIntervenciones } from "../application/puertosDeLectura";
import { aIntervencionGuardada } from "./aIntervencionGuardada";
import { intervenciones } from "./esquema";

/**
 * Cuantas filas trae la bandeja. No hay "Ver mas": la bandeja se acota a lo
 * reciente y los filtros son la forma de llegar al resto, a diferencia del
 * listado de reportes, que pagina porque tambien busca por texto.
 */
const LIMITE_DE_BANDEJA = 100;

export const lectorDeIntervencionesSql: LectorDeIntervenciones = {
  async listar(tx, filtros) {
    const condiciones = [
      filtros.estado ? eq(intervenciones.estado, filtros.estado) : undefined,
      filtros.tipo ? eq(intervenciones.tipo, filtros.tipo) : undefined,
      filtros.lugarId ? eq(intervenciones.lugarId, filtros.lugarId) : undefined,
    ].filter((condicion) => condicion !== undefined);

    const filas = await tx
      .select()
      .from(intervenciones)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(desc(intervenciones.capturadoEn))
      .limit(LIMITE_DE_BANDEJA);

    return filas.map(aIntervencionGuardada);
  },
};
