import { and, eq, isNull } from "drizzle-orm";
import type { RepositorioDeCallesDeZonas } from "../application/puertosDeZonas";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import { calles, callesDeZonas, domicilios, lugares } from "./esquema";

export const repositorioDeCallesDeZonasSql: RepositorioDeCallesDeZonas = {
  async domiciliosDeZona(tx, zonaId) {
    const filas = await tx
      .select({
        id: domicilios.id,
        calle: calles.nombre,
        calleId: domicilios.calleId,
        numero: domicilios.numero,
        lugar: lugares.nombre,
        lugarId: domicilios.lugarId,
      })
      .from(callesDeZonas)
      .innerJoin(domicilios, eq(domicilios.calleId, callesDeZonas.calleId))
      .innerJoin(calles, eq(calles.id, domicilios.calleId))
      .innerJoin(lugares, eq(lugares.id, domicilios.lugarId))
      .where(and(eq(callesDeZonas.zonaId, zonaId), isNull(domicilios.bajaEn)))
      .orderBy(lugares.nombre, calles.nombre, domicilios.numero, domicilios.id);

    return filas.map((fila) => ({
      ...fila,
      id: comoDomicilioId(fila.id),
      calleId: comoCalleId(fila.calleId),
      lugarId: comoLugarId(fila.lugarId),
    }));
  },
};
