import { and, count, eq, isNull } from "drizzle-orm";
import type {
  LugarGuardado,
  RepositorioDeLugares,
} from "../application/puertos";
import {
  CabeceraDuplicadaError,
  comoLugarId,
  type TipoDeLugar,
} from "../domain";
import { calles, domicilios, lugares, zonas } from "./esquema";
import { subarbolDeLugares } from "./subarbolDeLugaresSql";
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

  /**
   * Mismo filtro de baja que `buscarPorId`. Bajo `READ COMMITTED`, si otra
   * transaccion dio de baja la fila mientras esta esperaba el lock, Postgres
   * vuelve a evaluar el `WHERE` sobre la version confirmada y la fila ya no
   * sale: quien llega segundo ve el lugar como inexistente.
   */
  async bloquearPorId(tx, id) {
    const [fila] = await tx
      .select(columnasDeLectura)
      .from(lugares)
      .where(and(eq(lugares.id, id), isNull(lugares.bajaEn)))
      .for("update");

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

  async contarCallesActivas(tx, lugarId) {
    const [fila] = await tx
      .select({ total: count() })
      .from(calles)
      .where(and(eq(calles.lugarId, lugarId), isNull(calles.bajaEn)));

    return fila?.total ?? 0;
  },

  async contarZonasActivas(tx, lugarId) {
    const [fila] = await tx
      .select({ total: count() })
      .from(zonas)
      .where(and(eq(zonas.lugarId, lugarId), isNull(zonas.bajaEn)));

    return fila?.total ?? 0;
  },

  subarbol: subarbolDeLugares,

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

  async existeCabecera(tx) {
    const filas = await tx
      .select({ id: lugares.id })
      .from(lugares)
      .where(and(eq(lugares.tipo, "cabecera"), isNull(lugares.bajaEn)));
    return filas.length > 0;
  },
};
