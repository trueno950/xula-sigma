import { and, count, eq, isNull, or } from "drizzle-orm";
import type { RepositorioDeCalles } from "../application/puertos";
import { NombreDeCalleDuplicadoError } from "../domain";
import { calles, domicilios, eventosDeCalles } from "./esquema";
import { callesDeZonas } from "./esquemaDeCallesDeZonas";
import {
  aCalleGuardada,
  columnasDeLecturaDeCalle as columnasDeLectura,
} from "./lecturaDeCalle";
import { violaRestriccionUnica } from "./violacionDeRestriccion";

/**
 * `crear` y `actualizar` la comparten porque el indice se dispara en las
 * dos operaciones; el porque del rechazo esta en `domain/errores.ts`.
 */
const esChoqueDeNombreDuplicado = (error: unknown): boolean =>
  violaRestriccionUnica(error, "calles_tenant_lugar_nombre_idx");

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

  async contarZonasQueLaUsan(tx, calleId) {
    const [fila] = await tx
      .select({ total: count() })
      .from(callesDeZonas)
      .where(eq(callesDeZonas.calleId, calleId));

    return Number(fila?.total ?? 0);
  },

  async listarPorLugar(tx, lugarId) {
    const filas = await tx
      .select(columnasDeLectura)
      .from(calles)
      .where(and(eq(calles.lugarId, lugarId), isNull(calles.bajaEn)));

    return filas.map(aCalleGuardada);
  },

  async registrarEventoDeAlta(tx, { ayuntamientoId, calleId }) {
    await tx
      .insert(eventosDeCalles)
      .values({ ayuntamientoId, calleId, naturaleza: "ALTA" });
  },

  async registrarEventoDeRenombre(
    tx,
    { ayuntamientoId, calleId, nombreAnterior, nombreNuevo },
  ) {
    await tx.insert(eventosDeCalles).values({
      ayuntamientoId,
      calleId,
      naturaleza: "RENOMBRE",
      nombreAnterior,
      nombreNuevo,
    });
  },

  async registrarEventoDeReparenteo(
    tx,
    { ayuntamientoId, calleId, lugarAnteriorId, lugarNuevoId },
  ) {
    await tx.insert(eventosDeCalles).values({
      ayuntamientoId,
      calleId,
      naturaleza: "REPARENTEO",
      lugarAnteriorId,
      lugarNuevoId,
    });
  },

  async registrarEventoDeUbicacion(
    tx,
    { ayuntamientoId, calleId, puntoAnterior, puntoNuevo },
  ) {
    await tx.insert(eventosDeCalles).values({
      ayuntamientoId,
      calleId,
      naturaleza: "UBICACION",
      latitudAnterior: puntoAnterior?.latitud ?? null,
      longitudAnterior: puntoAnterior?.longitud ?? null,
      latitudNueva: puntoNuevo?.latitud ?? null,
      longitudNueva: puntoNuevo?.longitud ?? null,
    });
  },
};
