import { sql } from "drizzle-orm";
import type {
  DomicilioDelRegistro,
  RepositorioDeDomicilios,
} from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";
import { cteDescendientes } from "./jerarquiaDeLugaresSql";

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
export const registroDeDomiciliosSql: Pick<
  RepositorioDeDomicilios,
  "registro"
> = {
  async registro(tx, opciones) {
    const { filtros, limite } = opciones;
    const condicionDeRaiz = filtros.raizId
      ? sql`AND dom.lugar_id IN (SELECT id FROM descendientes)`
      : sql.empty();
    const condicionDeCalleId = filtros.calleId
      ? sql`AND dom.calle_id = ${filtros.calleId}`
      : sql.empty();
    const condicionDeCalle = filtros.calle
      ? sql`AND cal.nombre ILIKE ${`%${escaparComodinesDeLike(filtros.calle)}%`}`
      : sql.empty();
    const condicionDeNumero = filtros.numero
      ? sql`AND dom.numero = ${filtros.numero}`
      : sql.empty();
    const patronDeBusqueda = filtros.busqueda
      ? `%${escaparComodinesDeLike(filtros.busqueda)}%`
      : undefined;
    const nombreDeRaiz = sql`COALESCE(padre3.nombre, padre2.nombre, padre1.nombre, lug.nombre)`;
    const condicionDeBusqueda = patronDeBusqueda
      ? sql`AND (
          cal.nombre ILIKE ${patronDeBusqueda}
          OR dom.numero ILIKE ${patronDeBusqueda}
          OR lug.nombre ILIKE ${patronDeBusqueda}
          OR ${nombreDeRaiz} ILIKE ${patronDeBusqueda}
        )`
      : sql.empty();
    const filas = await tx.execute<FilaDeRegistro>(sql`
      ${cteDescendientes(filtros.raizId ?? null)}
      SELECT dom.id, cal.nombre AS calle, dom.calle_id AS "calleId",
             dom.numero, lug.nombre AS lugar, dom.lugar_id AS "lugarId",
             COALESCE(padre3.id, padre2.id, padre1.id, lug.id) AS "raizId",
             ${nombreDeRaiz} AS raiz
        FROM domicilios dom
        JOIN calles cal ON cal.id = dom.calle_id
        JOIN lugares lug ON lug.id = dom.lugar_id
        LEFT JOIN lugares padre1 ON padre1.id = lug.padre_id
        LEFT JOIN lugares padre2 ON padre2.id = padre1.padre_id
        LEFT JOIN lugares padre3 ON padre3.id = padre2.padre_id
       WHERE dom.baja_en IS NULL
             ${condicionDeRaiz}
             ${condicionDeCalleId}
             ${condicionDeCalle}
             ${condicionDeNumero}
             ${condicionDeBusqueda}
       ORDER BY lug.nombre, cal.nombre, dom.numero, dom.id
       LIMIT ${limite}
    `);

    return filas.map(aDomicilioDelRegistro);
  },
};
