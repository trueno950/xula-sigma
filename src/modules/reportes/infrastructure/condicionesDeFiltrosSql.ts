import { and, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";
import type { FiltrosDeListado } from "../application/puertos";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";
import { reportes } from "./esquema";

/**
 * Las condiciones del listado de la bandeja, compartidas por `listar`,
 * `buscar` y los conteos: sin una sola copia, los numeros de S2 podrian
 * contar un conjunto distinto del que la tabla muestra.
 *
 * Vive aparte de `listadoDeReportesSql.ts` para que los conteos no tengan que
 * importar el listado -ni al reves-, y por la metrica de lineas por archivo.
 */

/**
 * El «solo atrasados» de S1: `RECIBIDO` y con la fecha civil de registro
 * igual o anterior al corte.
 *
 * La fecha civil la calcula Postgres (`AT TIME ZONE`), no una resta de
 * milisegundos: es la misma zona que formatea `shared/lib/fecha` del lado de
 * JavaScript, y hacerla aca deja el filtro aplicado antes de paginar -un
 * recorte en memoria escondería filas de la pagina en vez de traer las que
 * corresponden-. `estado = 'RECIBIDO'` es parte de la condicion y no un
 * filtro de UI: solo un reporte sin atender puede estar atrasado, asi que
 * pedir «atrasados» con `estado=RESUELTO` no devuelve nada, y eso es correcto.
 */
const condicionDeAtraso = (desde: string): SQL =>
  and(
    eq(reportes.estado, "RECIBIDO"),
    sql`(${reportes.registradoEn} AT TIME ZONE 'America/Merida')::date <= ${desde}::date`,
  ) as SQL;

/**
 * El lugar elegido y su subarbol, ya resueltos por la pagina. Un arreglo
 * vacio es «ninguno»: `FALSE` en vez de «sin filtro», porque `?lugar=` con un
 * id de otro municipio tiene que devolver cero filas y no la bandeja entera
 * -RLS impide que aparezca nada ajeno de todos modos; esto impide tambien
 * leer el filtro fallido como si no se hubiera pedido-.
 */
const condicionDeLugar = (lugarIds: readonly string[]): SQL =>
  lugarIds.length > 0
    ? (inArray(reportes.lugarId, [...lugarIds]) as SQL)
    : (sql`FALSE` as SQL);

/**
 * Busqueda de texto libre sobre `folio`, `descripcion` y `referencia`.
 * `escaparComodinesDeLike` va antes de armar el patron: sin escapar, un "%" o
 * un "_" en lo que tipeo el operador actua como comodin de Postgres en vez de
 * como texto literal.
 */
const condicionDeBusqueda = (cadena: string): SQL => {
  const patron = `%${escaparComodinesDeLike(cadena)}%`;

  return or(
    ilike(reportes.folio, patron),
    ilike(reportes.descripcion, patron),
    ilike(reportes.referencia, patron),
  ) as SQL;
};

/** `estado`/`tipo`/`area`/`lugarIds`/`atrasadosDesde`, compartidas por las tres lecturas. */
export const condicionesDeFiltros = (filtros: FiltrosDeListado): SQL[] => {
  const condiciones: SQL[] = [];
  if (filtros.estado !== undefined) {
    condiciones.push(eq(reportes.estado, filtros.estado));
  }
  if (filtros.tipo !== undefined) {
    condiciones.push(eq(reportes.tipo, filtros.tipo));
  }
  if (filtros.area !== undefined) {
    condiciones.push(eq(reportes.areaResponsable, filtros.area));
  }
  if (filtros.lugarIds !== undefined) {
    condiciones.push(condicionDeLugar(filtros.lugarIds));
  }
  if (filtros.atrasadosDesde !== undefined) {
    condiciones.push(condicionDeAtraso(filtros.atrasadosDesde));
  }
  return condiciones;
};

/** Las condiciones de un listado o una busqueda, con o sin texto. */
export const condicionesDeLectura = (opciones: {
  filtros?: FiltrosDeListado;
  cadena?: string;
}): SQL[] => [
  ...condicionesDeFiltros(opciones.filtros ?? {}),
  ...(opciones.cadena === undefined
    ? []
    : [condicionDeBusqueda(opciones.cadena)]),
];
