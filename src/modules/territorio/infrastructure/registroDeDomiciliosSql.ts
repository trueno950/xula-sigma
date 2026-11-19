import { sql } from "drizzle-orm";
import type {
  DomicilioDelRegistro,
  FiltrosDeRegistro,
  RepositorioDeRegistroDeDomicilios,
} from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import { condicionDeBusquedaPorPalabras } from "./busquedaPorPalabras";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";
import { cteDescendientes } from "./jerarquiaDeLugaresSql";
import { textoDeBusquedaSql } from "./textoDeBusquedaSql";

type FilaDeRegistro = {
  id: string;
  calle: string;
  calleId: string;
  numero: string | null;
  lugar: string;
  lugarId: string;
  raizId: string;
  raiz: string;
};

type FilaDeConteo = { total: number; coincidencias: number };

const aDomicilioDelRegistro = (fila: FilaDeRegistro): DomicilioDelRegistro => ({
  ...fila,
  id: comoDomicilioId(fila.id),
  calleId: comoCalleId(fila.calleId),
  lugarId: comoLugarId(fila.lugarId),
  raizId: comoLugarId(fila.raizId),
});

/**
 * Si `raizId` no existe, el CTE no tiene filas y el filtro conserva el
 * resultado vacio; no se degrada a consultar todo el tenant. RLS acota
 * tambien el SELECT final, dentro de la misma transaccion de tenant.
 *
 * La raiz de cada fila sale de subir por `padre_id`, no del filtro: sin
 * filtro no hay `?raiz=` en la URL. `tipoDeLugar.ts` modela la jerarquia
 * con `RANGO` 0..1 -dos niveles-, asi que `padre1` alcanza; `padre2` y
 * `padre3` son finitos y cubren una cadena corrupta de colonias
 * encadenadas, que ninguna columna de Postgres prohibe.
 */
const nombreDeRaizSql = sql`COALESCE(padre3.nombre, padre2.nombre, padre1.nombre, lug.nombre)`;

const condicionesDe = (filtros: FiltrosDeRegistro) => ({
  raiz: filtros.raizId
    ? sql`AND dom.lugar_id IN (SELECT id FROM descendientes)`
    : sql.empty(),
  calleId: filtros.calleId
    ? sql`AND dom.calle_id = ${filtros.calleId}`
    : sql.empty(),
  calle: filtros.calle
    ? sql`AND ${textoDeBusquedaSql(sql`cal.nombre`)} LIKE ${textoDeBusquedaSql(
        sql`${`%${escaparComodinesDeLike(filtros.calle)}%`}::text`,
      )}`
    : sql.empty(),
  numero: filtros.numero
    ? sql`AND dom.numero = ${filtros.numero}`
    : sql.empty(),
  busqueda: filtros.busqueda
    ? sql`AND ${condicionDeBusquedaPorPalabras(filtros.busqueda, [
        sql`cal.nombre`,
        sql`dom.numero`,
        sql`lug.nombre`,
        nombreDeRaizSql,
      ])}`
    : sql.empty(),
});

/** Los tres `JOIN`/`LEFT JOIN` de los dos lectores: la calle, el lugar y su cadena de padres. */
const desdeElDomicilio = sql`
  FROM domicilios dom
  JOIN calles cal ON cal.id = dom.calle_id
  JOIN lugares lug ON lug.id = dom.lugar_id
  LEFT JOIN lugares padre1 ON padre1.id = lug.padre_id
  LEFT JOIN lugares padre2 ON padre2.id = padre1.padre_id
  LEFT JOIN lugares padre3 ON padre3.id = padre2.padre_id`;

const dondeVigentes = (filtros: FiltrosDeRegistro) => {
  const condiciones = condicionesDe(filtros);

  return sql`WHERE dom.baja_en IS NULL ${condiciones.raiz} ${condiciones.calleId} ${condiciones.calle} ${condiciones.numero} ${condiciones.busqueda}`;
};

const filaDeConteo = (conteo: FilaDeConteo | undefined): FilaDeConteo =>
  conteo ?? { total: 0, coincidencias: 0 };

export const registroDeDomiciliosSql: RepositorioDeRegistroDeDomicilios = {
  async registro(tx, opciones) {
    const { filtros, limite } = opciones;
    const filas = await tx.execute<FilaDeRegistro>(sql`
      ${cteDescendientes(filtros.raizId ?? null)}
      SELECT dom.id, cal.nombre AS calle, dom.calle_id AS "calleId",
             dom.numero, lug.nombre AS lugar, dom.lugar_id AS "lugarId",
             COALESCE(padre3.id, padre2.id, padre1.id, lug.id) AS "raizId",
             ${nombreDeRaizSql} AS raiz
       ${desdeElDomicilio}
       ${dondeVigentes(filtros)}
       ORDER BY lug.nombre, cal.nombre, dom.numero, dom.id
       LIMIT ${limite}
    `);

    return filas.map(aDomicilioDelRegistro);
  },

  /**
   * `coincidencias` cuenta bajo los mismos filtros que la pagina y `total`
   * no: el «9» de «5 de 9» es el municipio entero, que no cambia con la
   * busqueda. Un `COUNT` con `FILTER` y no dos consultas, para que los dos
   * numeros sean la misma foto del municipio.
   */
  async contar(tx, filtros) {
    const condiciones = condicionesDe(filtros);
    const filas = await tx.execute<FilaDeConteo>(sql`
      ${cteDescendientes(filtros.raizId ?? null)}
      SELECT COUNT(*) FILTER (
               WHERE TRUE ${condiciones.raiz} ${condiciones.calleId}
                 ${condiciones.calle} ${condiciones.numero}
                 ${condiciones.busqueda}
             )::int AS coincidencias,
             COUNT(*)::int AS total
       ${desdeElDomicilio}
       WHERE dom.baja_en IS NULL
    `);

    return filaDeConteo(filas[0]);
  },
};
