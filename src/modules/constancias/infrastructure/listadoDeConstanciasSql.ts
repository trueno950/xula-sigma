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
 * La version en SQL de `normalizarParaBusqueda`
 * (`shared/lib/textoDeBusqueda.ts`), copiada de
 * `territorio/infrastructure/textoDeBusquedaSql.ts`: un modulo no importa la
 * infraestructura de otro (`AGENTS.md`, capas), misma razon por la que
 * `escaparComodinesDeLike.ts` de este directorio esta duplicado. Sin
 * `unaccent` (`drizzle/0004_padron.sql` lo instala) porque tambien quita la
 * tilde de la enie, y "pena" no es "peña" -la regla de la busqueda del
 * padron-. `NFC` junta vocal y acento combinante antes de traducir, y las
 * mayusculas acentuadas van en la tabla porque `lower()` depende del
 * collation de la base.
 */
const EQUIVALENCIAS: readonly (readonly [string, string])[] = [
  ["a", "áàâäãåÁÀÂÄÃÅ"],
  ["e", "éèêëÉÈÊË"],
  ["i", "íìîïÍÌÎÏ"],
  ["o", "óòôöõÓÒÔÖÕ"],
  ["u", "úùûüÚÙÛÜ"],
  ["y", "ýÿÝ"],
  ["c", "çÇ"],
  ["ñ", "Ñ"],
];

const CON_ACENTO = EQUIVALENCIAS.map(([, variantes]) => variantes).join("");
const SIN_ACENTO = EQUIVALENCIAS.map(([base, variantes]) =>
  base.repeat([...variantes].length),
).join("");

const textoDeBusquedaSql = (expresion: SQL): SQL =>
  sql`translate(lower(normalize(${expresion}, NFC)), ${CON_ACENTO}, ${SIN_ACENTO})`;

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
    // `folio` se compara con `ILIKE` y el nombre con las dos puntas
    // normalizadas sin acentos (`textoDeBusquedaSql`), para que "jose"
    // encuentre a "José" como en el padron. Sin indice GIN ni trigramas
    // sobre el jsonb: esta rebanada no monto esa infraestructura, mismo
    // criterio que `listadoDeReportesSql.ts`.
    //
    // `escaparComodinesDeLike` va antes de armar el patron: sin escapar, un
    // "%" o un "_" en lo que tipeo el operador actua como comodin de
    // Postgres en vez de como texto literal.
    const cadenaEscapada = escaparComodinesDeLike(cadena);
    const patronDelNombre = textoDeBusquedaSql(
      sql`${`%${cadenaEscapada}%`}::text`,
    );
    const condiciones = [
      ...condicionesDeFiltros(opciones.filtros ?? {}),
      or(
        ilike(constancias.folio, `%${cadenaEscapada}%`),
        sql`${textoDeBusquedaSql(nombreDelTitular)} LIKE ${patronDelNombre}`,
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
