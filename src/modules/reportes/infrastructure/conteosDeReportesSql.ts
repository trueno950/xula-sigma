import { and, count } from "drizzle-orm";
import type { RepositorioDeReportes } from "../application/puertos";
import type { OpcionesDeConteo } from "../application/puertosDeListado";
import { condicionesDeLectura } from "./condicionesDeFiltrosSql";
import { reportes } from "./esquema";

/**
 * Los conteos por estado y por area de S2: dos `GROUP BY` bajo el `tx` de
 * `withTenant`, con las mismas condiciones que el listado
 * (`condicionesDeFiltrosSql.ts`). Se agrupa en Postgres y no en JavaScript
 * porque la bandeja viene paginada: contar las filas de la pagina daria el
 * conteo de 50 filas, no el de los filtros elegidos.
 *
 * Sin cota por tenant escrita a mano: la politica de la tabla ya acota el
 * `GROUP BY` al municipio de la transaccion, mismo criterio que `listar`.
 */
export const conteosDeReportesSql: Pick<RepositorioDeReportes, "contar"> = {
  async contar(tx, opciones: OpcionesDeConteo) {
    const condiciones = condicionesDeLectura(opciones);
    const donde = condiciones.length > 0 ? and(...condiciones) : undefined;

    const [porEstado, porArea] = await Promise.all([
      tx
        .select({ estado: reportes.estado, conteo: count() })
        .from(reportes)
        .where(donde)
        .groupBy(reportes.estado),
      tx
        .select({ area: reportes.areaResponsable, conteo: count() })
        .from(reportes)
        .where(donde)
        .groupBy(reportes.areaResponsable),
    ]);

    return { porEstado, porArea };
  },
};
