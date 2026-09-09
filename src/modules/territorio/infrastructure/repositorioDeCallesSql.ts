import { and, count, eq, isNull, or } from "drizzle-orm";
import type {
  CalleGuardada,
  RepositorioDeCalles,
} from "../application/puertos";
import {
  comoCalleId,
  comoLugarId,
  NombreDeCalleDuplicadoError,
} from "../domain";
import { calles, domicilios } from "./esquema";

const columnasDeLectura = {
  id: calles.id,
  nombre: calles.nombre,
  lugarId: calles.lugarId,
  latitud: calles.latitud,
  longitud: calles.longitud,
  bajaEn: calles.bajaEn,
};

const aCalleGuardada = (fila: {
  id: string;
  nombre: string;
  lugarId: string;
  latitud: number | null;
  longitud: number | null;
  bajaEn: Date | null;
}): CalleGuardada => ({
  ...fila,
  id: comoCalleId(fila.id),
  lugarId: comoLugarId(fila.lugarId),
  punto:
    fila.latitud === null || fila.longitud === null
      ? null
      : { latitud: fila.latitud, longitud: fila.longitud },
});

/**
 * `postgres.js` (el driver, `shared/tenancy/withTenant.ts`) marca la
 * violacion de restriccion unica con SQLSTATE `23505` y expone el nombre de
 * la restriccion en `constraint_name` -mismo campo que ya lista
 * `registroDeError.ts` como seguro para loguear-, pero drizzle envuelve ese
 * error de Postgres: los campos viven en `.cause`, no en el error que
 * llega aca (mismo hallazgo que documenta `registroDeError.ts`). `crear` y
 * `actualizar` la comparten porque el indice se dispara en las dos
 * operaciones; el porque del rechazo esta en `domain/errores.ts`.
 */
const esChoqueDeNombreDuplicado = (error: unknown): boolean => {
  let actual: unknown = error;
  const vistos = new Set<unknown>();

  while (actual && typeof actual === "object" && !vistos.has(actual)) {
    vistos.add(actual);
    const campos = actual as Record<string, unknown>;
    if (
      campos.code === "23505" &&
      campos.constraint_name === "calles_tenant_lugar_nombre_idx"
    ) {
      return true;
    }
    actual = campos.cause;
  }

  return false;
};

/**
 * Implementacion real de `RepositorioDeCalles` contra `calles` (precedente
 * `repositorioDeLugaresSql`: objeto literal, no clase).
 */
export const repositorioDeCallesSql: RepositorioDeCalles = {
  async crear(tx, { id, ayuntamientoId, nombre, lugarId }) {
    try {
      await tx.insert(calles).values({ id, ayuntamientoId, nombre, lugarId });
    } catch (error) {
      if (esChoqueDeNombreDuplicado(error)) {
        throw new NombreDeCalleDuplicadoError();
      }
      throw error;
    }
  },

  /** Mismo criterio "activo = `bajaEn IS NULL`" que `repositorioDeLugaresSql.buscarPorId`. */
  async buscarPorId(tx, id) {
    const [fila] = await tx
      .select(columnasDeLectura)
      .from(calles)
      .where(and(eq(calles.id, id), isNull(calles.bajaEn)));

    return fila ? aCalleGuardada(fila) : null;
  },

  async bloquearPorId(tx, id) {
    const [fila] = await tx
      .select(columnasDeLectura)
      .from(calles)
      .where(eq(calles.id, id))
      .for("update");

    return fila ? aCalleGuardada(fila) : null;
  },

  async actualizar(tx, { id, nombre, lugarId, punto, bajaEn }) {
    try {
      const [fila] = await tx
        .update(calles)
        .set({
          nombre,
          lugarId,
          latitud: punto?.latitud ?? null,
          longitud: punto?.longitud ?? null,
          bajaEn,
          actualizadoEn: new Date(),
        })
        .where(and(eq(calles.id, id), isNull(calles.bajaEn)))
        .returning(columnasDeLectura);

      return fila ? aCalleGuardada(fila) : null;
    } catch (error) {
      if (esChoqueDeNombreDuplicado(error)) {
        throw new NombreDeCalleDuplicadoError();
      }
      throw error;
    }
  },

  async contarDomiciliosQueLaUsan(tx, calleId) {
    const [fila] = await tx
      .select({ total: count() })
      .from(domicilios)
      .where(
        or(
          eq(domicilios.calleId, calleId),
          eq(domicilios.entreCalleAId, calleId),
          eq(domicilios.entreCalleBId, calleId),
        ),
      );

    return Number(fila?.total ?? 0);
  },

  async listarPorLugar(tx, lugarId) {
    const filas = await tx
      .select(columnasDeLectura)
      .from(calles)
      .where(and(eq(calles.lugarId, lugarId), isNull(calles.bajaEn)));

    return filas.map(aCalleGuardada);
  },
};
