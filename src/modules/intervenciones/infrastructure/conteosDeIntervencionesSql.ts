import { and, count } from "drizzle-orm";
import type { ContadorDeIntervenciones } from "../application/puertosDeLectura";
import { intervenciones } from "./esquema";
import { condicionesDeFiltrosDeIntervenciones } from "./lectorDeIntervencionesSql";

/**
 * Los conteos por estado del tablero (S2): un `GROUP BY` bajo el `tx` de
 * `withTenant`, con las mismas condiciones que el listado.
 *
 * Sin cota por tenant escrita a mano: la politica de la tabla acota el
 * `GROUP BY` al municipio de la transaccion, igual que `listar`. El estado
 * viaja en los filtros si la pantalla lo pide, pero el tablero lo omite para
 * que cada columna cuente lo que tiene con el resto de los filtros puestos.
 */
export const conteosDeIntervencionesSql: ContadorDeIntervenciones = {
  async contar(tx, filtros) {
    const condiciones = condicionesDeFiltrosDeIntervenciones(filtros);

    return tx
      .select({ estado: intervenciones.estado, conteo: count() })
      .from(intervenciones)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .groupBy(intervenciones.estado);
  },
};
