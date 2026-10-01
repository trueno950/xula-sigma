import { and, desc, isNull, type SQL, sql } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { OpcionesDeBusqueda } from "../application/puertos";
import { personas } from "./esquema";
import { columnasDeLectura, ordenPorPersona } from "./lecturaDePersonasSql";

/**
 * `strpos(nombre, ' ' || palabra)` y no `LIKE '% palabra%'`: dice "alguna
 * palabra empieza con esto" sin que `%`, `_` o `\` de lo que teclea la
 * operadora se lean como patron, y sin una cuarta copia de
 * `escaparComodinesDeLike`. `nombre_normalizado` junta sus palabras con un
 * solo espacio (`normalizarParaBusqueda`), asi que ese espacio marca el
 * inicio de palabra.
 */
const empiezaPalabra = (palabra: string) =>
  sql`(starts_with(${personas.nombreNormalizado}, ${palabra}) OR strpos(${personas.nombreNormalizado}, ${` ${palabra}`}) > 0)`;

/**
 * Lo que la busqueda suma a la similitud de trigramas: prefijo de palabra
 * sobre el nombre normalizado y prefijo de CURP. La similitud sola no
 * encuentra "Poot" dentro de "maria guadalupe poot canul" -una palabra
 * suelta comparte pocos trigramas con la cadena entera-, y nunca consulta
 * la CURP.
 *
 * **Una rama por criterio, unidas con `UNION`, y no un solo `OR`.** Con el
 * `OR`, Postgres no puede armar un plan por indice: un `OR` se resuelve por
 * `BitmapOr` solo si **todas** sus ramas son sargables, y ni `starts_with`
 * ni `strpos` lo son, asi que el planner caia a un `Seq Scan` con el `%`
 * como filtro -el `%` quedaba detras de una condicion que el indice GIN no
 * puede usar, que es justo lo que el escenario de sargabilidad del spec
 * ("Busqueda tolerante a variantes con trigramas") existe para descartar-.
 * Separadas, cada rama se planifica sola y la de trigramas vuelve a ser un
 * `Bitmap Index Scan` sobre `personas_nombre_normalizado_trgm_idx`. El
 * `UNION` -y no `UNION ALL`- deduplica en SQL: una fila que cumple dos
 * criterios consume un solo lugar del `LIMIT`, que es lo que un `UNION ALL`
 * con deduplicacion en la aplicacion no puede garantizar sin traer todas
 * las coincidencias del municipio.
 *
 * `cadenaExpandida` ya paso por `normalizarParaBusqueda`; la CURP sale de
 * `cadena` porque la expansion de abreviaturas no debe tocarla.
 */
export const ramasDeCoincidencia = (
  cadenaExpandida: string,
  { palabras = [], curp }: OpcionesDeBusqueda,
): readonly [SQL, SQL, SQL] => {
  const palabrasDeLaBusqueda =
    palabras.length > 0 ? and(...palabras.map(empiezaPalabra)) : undefined;

  // Las tres ramas siempre estan, con `false` en las que no aplican:
  // aridad fija evita ramas condicionales y la asercion de que "la segunda
  // siempre existe". Una `WHERE false` no escanea nada.
  return [
    sql`${personas.nombreNormalizado} % ${cadenaExpandida}`,
    palabrasDeLaBusqueda ?? sql`false`,
    curp ? sql`starts_with(${personas.curp}::text, ${curp})` : sql`false`,
  ];
};

/**
 * La consulta real de `buscar`: cada rama de `ramasDeCoincidencia` como su
 * propio `SELECT`, unidos con `UNION` y ordenados por relevancia -o por
 * apellido si el operador lo pidio-. Vive aca, exportada, para que el test
 * de sargabilidad EXPLAINee esta misma consulta y no una reconstruccion
 * paralela que podria dejar de parecerse a la que corre en produccion.
 */
export const consultaDeBusqueda = (
  tx: TransaccionTenant,
  cadenaExpandida: string,
  opciones: OpcionesDeBusqueda,
) => {
  const relevancia =
    sql<number>`similarity(${personas.nombreNormalizado}, ${cadenaExpandida})`.as(
      "relevancia",
    );

  const coincideCurp = opciones.curp
    ? sql<boolean>`starts_with(${personas.curp}::text, ${opciones.curp})`.as(
        "coincide_curp",
      )
    : undefined;

  const seleccion = {
    ...columnasDeLectura,
    /**
     * El `ORDER BY` de un `UNION` reescribe cada columna con su nombre sin
     * pasar por `casing` ("primerApellido"), mientras que la lista de
     * seleccion si lo pasa ("primer_apellido"); el alias deja las dos
     * iguales. Drizzle 0.45.2, `buildSetOperationQuery` en
     * `pg-core/dialect.js`.
     */
    primerApellido: sql<string>`${personas.primerApellido}`.as(
      "primerApellido",
    ),
    relevancia,
    ...(coincideCurp ? { coincideCurp } : {}),
  };

  const unaRama = (condicion: SQL) =>
    tx
      .select(seleccion)
      .from(personas)
      .where(
        and(
          isNull(personas.bajaEn),
          // Redirigida por una fusion: mismo motivo que `listar`.
          isNull(personas.fusionadaEn),
          condicion,
        ),
      );

  const [trigramas, palabras, curp] = ramasDeCoincidencia(
    cadenaExpandida,
    opciones,
  );

  const unidas = union(unaRama(trigramas), unaRama(palabras), unaRama(curp));

  /**
   * Con CURP pedida, la coincidencia de CURP va primero: su `similarity`
   * con la cadena es casi cero -una CURP no comparte trigramas con un
   * nombre-, asi que sin esto quedaba detras de las coincidencias de
   * nombre y podia caer fuera de la pagina. `NULLS LAST` porque `DESC`
   * pone los `NULL` -toda fila sin CURP- primero.
   */
  const orden = opciones.orden
    ? ordenPorPersona(opciones.orden.direccion)
    : coincideCurp
      ? [sql`${coincideCurp} desc nulls last`, desc(relevancia)]
      : [desc(relevancia)];

  return unidas.orderBy(...orden).limit(opciones.limite);
};
