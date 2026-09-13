import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type {
  FiltrosDeListado,
  OpcionesDeListado,
  RepositorioDeReportes,
} from "../application/puertos";
import type {
  LectorDeReportesDeHistorial,
  LectorDeReportesDeMapa,
} from "../application/puertosDeLecturaDeReportes";
import { aReporteGuardado } from "./aReporteGuardado";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";
import { reportes } from "./esquema";

/**
 * `listar` y `buscar` del panel (`design.md`, "Filtros", "Paginacion",
 * "Ordenamiento de columnas" y "Buscador), aparte de
 * `repositorioDeReportesSql.ts` por la metrica de lineas por archivo
 * (`AGENTS.md`, <= 200) -mismo criterio que `similaresDeReportesSql.ts`.
 * `repositorioDeReportesSql.ts` lo incorpora por spread.
 *
 * Tambien vive aca `lectorDeReportesDeMapaSql`: el contrato completo esta
 * en `puertosDeLecturaDeReportes.ts`.
 */

/** `estado`/`tipo` de `FiltrosDeListado`, compartidas por `listar` y `buscar`. */
const condicionesDeFiltros = (filtros: FiltrosDeListado): SQL[] => {
  const condiciones: SQL[] = [];
  if (filtros.estado !== undefined) {
    condiciones.push(eq(reportes.estado, filtros.estado));
  }
  if (filtros.tipo !== undefined) {
    condiciones.push(eq(reportes.tipo, filtros.tipo));
  }
  return condiciones;
};

/**
 * `opciones.orden` de `design.md`, "Ordenamiento de columnas": "folio" es
 * el texto ya impreso -alfanumerico, ordena igual que el consecutivo
 * porque el relleno de ceros lo mantiene del mismo ancho- y "registrado"
 * es `registradoEn`. Sin orden pedido, `registradoEn DESC` -el reporte mas
 * reciente primero, el orden operativo de una bandeja de entrada.
 */
const ordenarPor = (orden: OpcionesDeListado["orden"]) => {
  if (!orden) return desc(reportes.registradoEn);

  const columna =
    orden.campo === "folio" ? reportes.folio : reportes.registradoEn;
  return orden.direccion === "desc" ? desc(columna) : asc(columna);
};

export const listadoDeReportesSql: Pick<
  RepositorioDeReportes,
  "listar" | "buscar"
> = {
  async listar(tx, filtros, opciones) {
    // Sin `WHERE ayuntamiento_id` a mano: la politica de la tabla ya acota
    // el SELECT al tenant de la transaccion (mismo criterio que
    // `similaresAbiertos`, design.md seccion 13).
    const condiciones = condicionesDeFiltros(filtros);

    const filas = await tx
      .select()
      .from(reportes)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(ordenarPor(opciones.orden))
      .limit(opciones.limite);

    return filas.map(aReporteGuardado);
  },

  async buscar(tx, cadena, opciones) {
    // `ILIKE '%...%'` simple sobre las tres columnas de texto -sin indice
    // GIN ni trigramas: esta rebanada no monto esa infraestructura para
    // `reportes` (a diferencia de `padron`), y un listado municipal no
    // necesita tolerancia a variantes para encontrar un folio o una
    // palabra de la descripcion. `%` no es sargable sin GIN, pero la
    // politica de tenant ya acota el barrido a un solo municipio.
    //
    // `escaparComodinesDeLike` va antes de armar el patron: sin escapar,
    // un "%" o un "_" en lo que tipeo el operador actua como comodin de
    // Postgres en vez de como texto literal.
    const cadenaEscapada = escaparComodinesDeLike(cadena);
    const condiciones = [
      ...condicionesDeFiltros(opciones.filtros ?? {}),
      or(
        ilike(reportes.folio, `%${cadenaEscapada}%`),
        ilike(reportes.descripcion, `%${cadenaEscapada}%`),
        ilike(reportes.referencia, `%${cadenaEscapada}%`),
      ) as SQL,
    ];

    const filas = await tx
      .select()
      .from(reportes)
      .where(and(...condiciones))
      .orderBy(ordenarPor(opciones.orden))
      .limit(opciones.limite);

    return filas.map(aReporteGuardado);
  },
};

/**
 * El `select` explicito es la garantia de que `descripcion` y `referencia`
 * no salen por aca: un `select()` pelado las arrastraria. Sin `WHERE` de
 * `calle_id`, mismo criterio que la politica de tenant: las filas sin calle
 * son cobertura faltante valida.
 */
export const lectorDeReportesDeMapaSql: LectorDeReportesDeMapa &
  LectorDeReportesDeHistorial = {
  async listarParaMapa(tx) {
    return tx
      .select({
        id: reportes.id,
        folio: reportes.folio,
        tipo: reportes.tipo,
        estado: reportes.estado,
        calleId: reportes.calleId,
        lugarId: reportes.lugarId,
      })
      .from(reportes);
  },

  listarPorCalle(tx, calleId) {
    return tx
      .select({
        id: reportes.id,
        registradoEn: reportes.registradoEn,
      })
      .from(reportes)
      .where(eq(reportes.calleId, calleId));
  },
};
