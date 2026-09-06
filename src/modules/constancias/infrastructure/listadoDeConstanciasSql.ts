import {
  and,
  asc,
  desc,
  ilike,
  isNotNull,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type {
  FiltrosDeListado,
  OpcionesDeListado,
  RepositorioDeConstancias,
} from "../application/puertos";
import { aConstanciaGuardada } from "./aConstanciaGuardada";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";
import { constancias } from "./esquema";

/**
 * `listar` y `buscar` del panel (`design.md`, "Filtros", "Paginacion",
 * "Ordenamiento de columnas" y "Buscador"), aparte de
 * `repositorioDeConstanciasSql.ts` por la metrica de lineas por archivo
 * (`AGENTS.md`, <= 200) -mismo criterio que `listadoDeReportesSql.ts` de
 * `reportes`. `repositorioDeConstanciasSql.ts` lo incorpora por spread.
 */

/**
 * `estado` de `FiltrosDeListado` no es una columna: se deriva de
 * `canceladaEn` (`domain/estadoDeConstancia.ts`). VIGENTE es
 * `canceladaEn IS NULL`, CANCELADA lo contrario.
 */
const condicionesDeFiltros = (filtros: FiltrosDeListado): SQL[] => {
  if (filtros.estado === "VIGENTE") return [isNull(constancias.canceladaEn)];
  if (filtros.estado === "CANCELADA") {
    return [isNotNull(constancias.canceladaEn)];
  }
  return [];
};

/**
 * `datos->'titular'->>'nombreCompleto'`: acceso jsonb-a-texto de Postgres,
 * expresado con `sql` de Drizzle porque no hay builder de columnas para
 * operadores de jsonb. La ruta es fija -`validacionDeSnapshot.ts` declara
 * que todo snapshot trae `titular.nombreCompleto`- y nunca lleva entrada de
 * usuario en el template, solo el nombre de columna: sin riesgo de
 * inyeccion.
 */
const nombreDelTitular = sql`${constancias.datos}->'titular'->>'nombreCompleto'`;

/**
 * `opciones.orden` de `design.md`, "Ordenamiento de columnas": "folio" es
 * el texto ya impreso y "emitida" es `emitidaEn`. Sin orden pedido,
 * `emitidaEn DESC` -la constancia mas reciente primero.
 */
const ordenarPor = (orden: OpcionesDeListado["orden"]) => {
  if (!orden) return desc(constancias.emitidaEn);

  const columna =
    orden.campo === "folio" ? constancias.folio : constancias.emitidaEn;
  return orden.direccion === "desc" ? desc(columna) : asc(columna);
};

export const listadoDeConstanciasSql: Pick<
  RepositorioDeConstancias,
  "listar" | "buscar"
> = {
  async listar(tx, filtros, opciones) {
    // Sin `WHERE ayuntamiento_id` a mano: la politica de la tabla ya acota
    // el SELECT al tenant de la transaccion.
    const condiciones = condicionesDeFiltros(filtros);

    const filas = await tx
      .select()
      .from(constancias)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(ordenarPor(opciones.orden))
      .limit(opciones.limite);

    return filas.map(aConstanciaGuardada);
  },

  async buscar(tx, cadena, opciones) {
    // `ILIKE '%...%'` sobre `folio` y sobre el nombre del titular -sin
    // indice GIN ni trigramas: esta rebanada no monto esa infraestructura,
    // mismo criterio que `listadoDeReportesSql.ts`.
    //
    // `escaparComodinesDeLike` va antes de armar el patron: sin escapar, un
    // "%" o un "_" en lo que tipeo el operador actua como comodin de
    // Postgres en vez de como texto literal.
    const cadenaEscapada = escaparComodinesDeLike(cadena);
    const condiciones = [
      ...condicionesDeFiltros(opciones.filtros ?? {}),
      or(
        ilike(constancias.folio, `%${cadenaEscapada}%`),
        ilike(nombreDelTitular, `%${cadenaEscapada}%`),
      ) as SQL,
    ];

    const filas = await tx
      .select()
      .from(constancias)
      .where(and(...condiciones))
      .orderBy(ordenarPor(opciones.orden))
      .limit(opciones.limite);

    return filas.map(aConstanciaGuardada);
  },
};
