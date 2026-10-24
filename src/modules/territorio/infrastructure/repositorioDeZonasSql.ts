import { and, eq, inArray, isNull } from "drizzle-orm";
import type { RepositorioDeLecturaDeZonas } from "../application/puertosDeLecturaDeZonas";
import { calles, callesDeZonas, lugares, zonas } from "./esquema";

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

export const repositorioDeZonasSql: RepositorioDeLecturaDeZonas = {
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
};
