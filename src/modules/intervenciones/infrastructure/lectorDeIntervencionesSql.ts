import { and, desc, eq, type SQL } from "drizzle-orm";
import type {
  FiltrosDeIntervenciones,
  LectorDeIntervenciones,
} from "../application/puertosDeLectura";
import { aIntervencionGuardada } from "./aIntervencionGuardada";
import { intervenciones } from "./esquema";

/**
 * Cuantas filas trae la bandeja. No hay "Ver mas": la bandeja se acota a lo
 * reciente y los filtros son la forma de llegar al resto, a diferencia del
 * listado de reportes, que pagina porque tambien busca por texto.
 */
const LIMITE_DE_BANDEJA = 100;

/**
 * Las condiciones de la bandeja, compartidas por `listar` y por los conteos
 * de `conteosDeIntervencionesSql.ts`: sin una sola copia, los numeros del
 * tablero podrian contar un conjunto distinto del que las columnas muestran.
 */
export const condicionesDeFiltrosDeIntervenciones = (
  filtros: FiltrosDeIntervenciones,
): SQL[] =>
  [
    filtros.estado ? eq(intervenciones.estado, filtros.estado) : undefined,
    filtros.tipo ? eq(intervenciones.tipo, filtros.tipo) : undefined,
    filtros.lugarId ? eq(intervenciones.lugarId, filtros.lugarId) : undefined,
  ].filter((condicion) => condicion !== undefined);

export const lectorDeIntervencionesSql: LectorDeIntervenciones = {
  async listar(tx, filtros) {
    const condiciones = condicionesDeFiltrosDeIntervenciones(filtros);

    const filas = await tx
      .select()
      .from(intervenciones)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(
        desc(intervenciones.fechaDeOcurrencia),
        desc(intervenciones.capturadoEn),
      )
      .limit(LIMITE_DE_BANDEJA);

    return filas.map(aIntervencionGuardada);
  },
};
