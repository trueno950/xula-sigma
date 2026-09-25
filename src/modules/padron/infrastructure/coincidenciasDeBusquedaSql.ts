import { and, or, sql } from "drizzle-orm";
import type { OpcionesDeBusqueda } from "../application/puertos";
import { personas } from "./esquema";

/**
 * `strpos(nombre, ' ' || palabra)` y no `LIKE '% palabra%'`: dice "alguna
 * palabra empieza con esto" sin que `%`, `_` o `\` de lo que teclea la
 * operadora se lean como patron, y sin una cuarta copia de
 * `escaparComodinesDeLike`. `nombre_normalizado` junta sus palabras con un
 * solo espacio (`normalizarParaBusqueda`), asi que ese espacio marca el
 * inicio de palabra. Costo: ni `strpos` ni `starts_with(curp)` usan el
 * indice GIN; con el `OR` la busqueda recorre las filas del municipio, no
 * el indice trigramico -aceptable en el tamano de un padron municipal.
 */
const empiezaPalabra = (palabra: string) =>
  sql`(starts_with(${personas.nombreNormalizado}, ${palabra}) OR strpos(${personas.nombreNormalizado}, ${` ${palabra}`}) > 0)`;

export const coincideConLaBusqueda = (
  cadenaExpandida: string,
  { palabras = [], curp }: OpcionesDeBusqueda,
) =>
  or(
    sql`${personas.nombreNormalizado} % ${cadenaExpandida}`,
    palabras.length > 0 ? and(...palabras.map(empiezaPalabra)) : undefined,
    curp ? sql`starts_with(${personas.curp}::text, ${curp})` : undefined,
  );
