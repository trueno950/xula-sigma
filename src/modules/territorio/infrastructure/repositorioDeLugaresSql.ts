import { and, count, eq, isNull, sql } from "drizzle-orm";
import type {
  LugarGuardado,
  NodoDeSubarbol,
  RepositorioDeLugares,
} from "../application/puertos";
import {
  CabeceraDuplicadaError,
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  type TipoDeLugar,
} from "../domain";
import { domicilios, lugares } from "./esquema";
import { violaRestriccionUnica } from "./violacionDeRestriccion";

const columnasDeLectura = {
  id: lugares.id,
  tipo: lugares.tipo,
  nombre: lugares.nombre,
  padreId: lugares.padreId,
  bajaEn: lugares.bajaEn,
};

const aLugarGuardado = (fila: {
  id: string;
  tipo: TipoDeLugar;
  nombre: string;
  padreId: string | null;
  bajaEn: Date | null;
}): LugarGuardado => ({
  ...fila,
  id: comoLugarId(fila.id),
  padreId: fila.padreId ? comoLugarId(fila.padreId) : null,
});

type FilaDeSubarbol = {
  clase: "lugar" | "domicilio";
  id: string;
  tipo: TipoDeLugar | null;
  nombre: string | null;
  padreId: string | null;
  lugarId: string | null;
  calleId: string | null;
  calle: string | null;
  numero: string | null;
};

const aNodoDeSubarbol = (fila: FilaDeSubarbol): NodoDeSubarbol =>
  fila.clase === "lugar"
    ? {
        clase: "lugar",
        id: comoLugarId(fila.id),
        tipo: fila.tipo as TipoDeLugar,
        nombre: fila.nombre as string,
        padreId: fila.padreId ? comoLugarId(fila.padreId) : null,
      }
    : {
        clase: "domicilio",
        id: comoDomicilioId(fila.id),
        lugarId: comoLugarId(fila.lugarId as string),
        calleId: comoCalleId(fila.calleId as string),
        calle: fila.calle as string,
        numero: fila.numero,
      };

/**
 * Implementacion real de `RepositorioDeLugares` contra `lugares` y
 * `domicilios`. Objeto literal, no clase (precedente
 * `repositorioDePersonasSql`).
 */
export const repositorioDeLugaresSql: RepositorioDeLugares = {
  async crear(tx, { id, ayuntamientoId, tipo, nombre, padreId }) {
    try {
      await tx
        .insert(lugares)
        .values({ id, ayuntamientoId, tipo, nombre, padreId });
    } catch (error) {
      if (violaRestriccionUnica(error, "lugares_una_cabecera")) {
        throw new CabeceraDuplicadaError();
      }
      throw error;
    }
  },

  /**
   * Excluye `bajaEn` no nulo (hallazgo de GGA en la revision de esta
   * rebanada): sin este filtro, `altaDeLugar`/`reparentearLugar` podian
   * usar un lugar dado de baja como padre valido -la fila sigue
   * existiendo, `puedeContener` no sabe de bajas- y una rama cerrada
   * volvia a recibir descendientes. Mismo criterio "activo = `bajaEn IS
   * NULL`" que ya aplica `contarHijosActivos`.
   */
  async buscarPorId(tx, id) {
    const [fila] = await tx
      .select(columnasDeLectura)
      .from(lugares)
      .where(and(eq(lugares.id, id), isNull(lugares.bajaEn)));

    return fila ? aLugarGuardado(fila) : null;
  },

  async actualizar(tx, { id, nombre, padreId, bajaEn }) {
    await tx
      .update(lugares)
      .set({ nombre, padreId, bajaEn, actualizadoEn: new Date() })
      .where(eq(lugares.id, id));
  },

  async contarHijosActivos(tx, lugarId) {
    const [fila] = await tx
      .select({ total: count() })
      .from(lugares)
      .where(and(eq(lugares.padreId, lugarId), isNull(lugares.bajaEn)));

    return fila?.total ?? 0;
  },

  async contarDomiciliosColgados(tx, lugarId) {
    const [fila] = await tx
      .select({ total: count() })
      .from(domicilios)
      .where(eq(domicilios.lugarId, lugarId));

    return fila?.total ?? 0;
  },

  /**
   * `WITH RECURSIVE` en `sql` crudo y no con el builder de Drizzle: la
   * version instalada (0.45.2, verificado — no exporta `withRecursive` ni
   * nada equivalente) no tiene forma de expresar un CTE que se referencia
   * a si mismo. Es la unica consulta del archivo que lo necesita; el resto
   * usa el builder. Solo `raizId` es parametro; el resto es identificador
   * fijo, sin texto de usuario que concatenar (design.md seccion 12,
   * "SUBARBOL"). RLS acota las dos ramas y el `UNION ALL` final, porque
   * las tres corren bajo el mismo `tx` con `app.tenant` ya fijado.
   */
  async subarbol(tx, raizId) {
    const filas = await tx.execute<FilaDeSubarbol>(sql`
      WITH RECURSIVE descendientes AS (
        SELECT id, 0 AS profundidad FROM lugares
         WHERE id = ${raizId} AND baja_en IS NULL
        UNION ALL
        SELECT l.id, d.profundidad + 1
          FROM lugares l
          JOIN descendientes d ON l.padre_id = d.id
         WHERE d.profundidad < 8 AND l.baja_en IS NULL
      )
      SELECT 'lugar' AS clase, l.id, l.tipo, l.nombre,
             l.padre_id AS "padreId", NULL::uuid AS "lugarId",
             NULL::uuid AS "calleId", NULL::text AS calle, NULL::text AS numero
        FROM lugares l
        JOIN descendientes d ON d.id = l.id
       WHERE l.id <> ${raizId} AND l.baja_en IS NULL
      UNION ALL
      SELECT 'domicilio' AS clase, dom.id, NULL, NULL,
             NULL, dom.lugar_id AS "lugarId",
             dom.calle_id AS "calleId", cal.nombre AS calle, dom.numero
        FROM domicilios dom
        JOIN descendientes d ON d.id = dom.lugar_id
        JOIN calles cal ON cal.id = dom.calle_id
       WHERE dom.baja_en IS NULL
    `);

    return filas.map(aNodoDeSubarbol);
  },

  async listarRaices(tx) {
    const filas = await tx
      .select(columnasDeLectura)
      .from(lugares)
      .where(and(isNull(lugares.padreId), isNull(lugares.bajaEn)))
      .orderBy(lugares.nombre);

    return filas.map(aLugarGuardado);
  },

  /**
   * Todos los lugares activos, no solo las raices: alimenta el selector de
   * "lugar padre" del alta desde la vista de raices, donde la pagina no
   * carga subarbol (solo lo hace con `?raiz=`).
   */
  async listarLugares(tx) {
    const filas = await tx
      .select(columnasDeLectura)
      .from(lugares)
      .where(isNull(lugares.bajaEn))
      .orderBy(lugares.nombre);

    return filas.map(aLugarGuardado);
  },
};
