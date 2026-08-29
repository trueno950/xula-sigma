import { and, eq, isNull } from "drizzle-orm";
import type {
  CalleGuardada,
  RepositorioDeCalles,
} from "../application/puertos";
import {
  comoCalleId,
  comoLugarId,
  NombreDeCalleDuplicadoError,
} from "../domain";
import { calles } from "./esquema";

const columnasDeLectura = {
  id: calles.id,
  nombre: calles.nombre,
  lugarId: calles.lugarId,
  bajaEn: calles.bajaEn,
};

const aCalleGuardada = (fila: {
  id: string;
  nombre: string;
  lugarId: string;
  bajaEn: Date | null;
}): CalleGuardada => ({
  ...fila,
  id: comoCalleId(fila.id),
  lugarId: comoLugarId(fila.lugarId),
});

/**
 * `postgres.js` (el driver, `shared/tenancy/withTenant.ts`) marca la
 * violacion de restriccion unica con SQLSTATE `23505` y expone el nombre de
 * la restriccion en `constraint_name` -mismo campo que ya lista
 * `registroDeError.ts` como seguro para loguear-, pero drizzle envuelve ese
 * error de Postgres: los campos viven en `.cause`, no en el error que
 * llega aca (mismo hallazgo que documenta `registroDeError.ts`). Solo el
 * choque contra `calles_tenant_lugar_nombre_idx` se traduce a dominio;
 * cualquier otro error de Postgres se deja pasar tal cual.
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
    await tx.insert(calles).values({ id, ayuntamientoId, nombre, lugarId });
  },

  async actualizar(tx, { id, nombre }) {
    try {
      const [fila] = await tx
        .update(calles)
        .set({ nombre, actualizadoEn: new Date() })
        .where(eq(calles.id, id))
        .returning(columnasDeLectura);

      return fila ? aCalleGuardada(fila) : null;
    } catch (error) {
      if (esChoqueDeNombreDuplicado(error)) {
        throw new NombreDeCalleDuplicadoError();
      }
      throw error;
    }
  },

  async listarPorLugar(tx, lugarId) {
    const filas = await tx
      .select(columnasDeLectura)
      .from(calles)
      .where(and(eq(calles.lugarId, lugarId), isNull(calles.bajaEn)));

    return filas.map(aCalleGuardada);
  },
};
