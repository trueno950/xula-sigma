import { and, eq, inArray, isNull } from "drizzle-orm";
import type { RepositorioDeAdministracionDeZonas } from "../application/puertosDeAdministracionDeZonas";
import type { RepositorioDeLecturaDeZonas } from "../application/puertosDeLecturaDeZonas";
import { NombreDeZonaDuplicadoError } from "../domain";
import { calles, callesDeZonas, lugares, zonas } from "./esquema";
import { violaRestriccionUnica } from "./violacionDeRestriccion";

const seleccionDeZona = {
  id: zonas.id,
  nombre: zonas.nombre,
  lugarId: zonas.lugarId,
  asentamiento: lugares.nombre,
};
const zonaActiva = and(
  isNull(zonas.bajaEn),
  isNull(lugares.bajaEn),
  inArray(lugares.tipo, ["cabecera", "comisaria"]),
);

/**
 * `crear` comparte traduccion con `renombrar`: el indice parcial
 * `zonas_tenant_lugar_nombre_idx` (solo activas, decision S6) se dispara
 * en las dos operaciones, y el check previo del caso de uso no elimina la
 * carrera entre dos altas simultaneas del mismo nombre.
 */
const esChoqueDeNombreDuplicado = (error: unknown): boolean =>
  violaRestriccionUnica(error, "zonas_tenant_lugar_nombre_idx");

export const repositorioDeZonasSql: RepositorioDeLecturaDeZonas &
  RepositorioDeAdministracionDeZonas = {
  async listar(tx, raizId) {
    return tx
      .select(seleccionDeZona)
      .from(zonas)
      .innerJoin(lugares, eq(lugares.id, zonas.lugarId))
      .where(and(zonaActiva, raizId ? eq(zonas.lugarId, raizId) : undefined))
      .orderBy(lugares.nombre, zonas.nombre, zonas.id);
  },
  async buscarPorId(tx, id) {
    const [zona] = await tx
      .select(seleccionDeZona)
      .from(zonas)
      .innerJoin(lugares, eq(lugares.id, zonas.lugarId))
      .where(and(zonaActiva, eq(zonas.id, id)));
    return zona ?? null;
  },
  async calles(tx, zonaId) {
    return tx
      .select({ id: calles.id, nombre: calles.nombre })
      .from(callesDeZonas)
      .innerJoin(calles, eq(calles.id, callesDeZonas.calleId))
      .where(and(eq(callesDeZonas.zonaId, zonaId), isNull(calles.bajaEn)))
      .orderBy(calles.nombre, calles.id);
  },

  async buscarActivaPorNombre(tx, { lugarId, nombre }) {
    const [zona] = await tx
      .select({ id: zonas.id, nombre: zonas.nombre, lugarId: zonas.lugarId })
      .from(zonas)
      .where(
        and(
          eq(zonas.lugarId, lugarId),
          eq(zonas.nombre, nombre),
          isNull(zonas.bajaEn),
        ),
      );
    return zona ?? null;
  },
  async crear(tx, { id, lugarId, nombre, ayuntamientoId }) {
    try {
      await tx.insert(zonas).values({ id, lugarId, nombre, ayuntamientoId });
    } catch (error) {
      if (esChoqueDeNombreDuplicado(error)) {
        throw new NombreDeZonaDuplicadoError();
      }
      throw error;
    }
  },
  async bloquearPorId(tx, id) {
    const [zona] = await tx
      .select({ id: zonas.id, nombre: zonas.nombre, lugarId: zonas.lugarId })
      .from(zonas)
      .where(and(eq(zonas.id, id), isNull(zonas.bajaEn)))
      .for("update");
    return zona ?? null;
  },
  async renombrar(tx, { id, nombre }) {
    try {
      await tx.update(zonas).set({ nombre }).where(eq(zonas.id, id));
    } catch (error) {
      if (esChoqueDeNombreDuplicado(error)) {
        throw new NombreDeZonaDuplicadoError();
      }
      throw error;
    }
  },
  async darDeBaja(tx, id) {
    await tx.update(zonas).set({ bajaEn: new Date() }).where(eq(zonas.id, id));
  },
  async calleActivaPorId(tx, calleId) {
    const [calle] = await tx
      .select({ id: calles.id, lugarId: calles.lugarId })
      .from(calles)
      .where(and(eq(calles.id, calleId), isNull(calles.bajaEn)));
    return calle ?? null;
  },
  async perteneceLaCalle(tx, { zonaId, calleId }) {
    const [fila] = await tx
      .select({ zonaId: callesDeZonas.zonaId })
      .from(callesDeZonas)
      .where(
        and(
          eq(callesDeZonas.zonaId, zonaId),
          eq(callesDeZonas.calleId, calleId),
        ),
      );
    return fila !== undefined;
  },
  async agregarCalle(tx, { zonaId, calleId, lugarId, ayuntamientoId }) {
    await tx
      .insert(callesDeZonas)
      .values({ zonaId, calleId, lugarId, ayuntamientoId });
  },
  async quitarCalle(tx, { zonaId, calleId }) {
    await tx
      .delete(callesDeZonas)
      .where(
        and(
          eq(callesDeZonas.zonaId, zonaId),
          eq(callesDeZonas.calleId, calleId),
        ),
      );
  },
};
