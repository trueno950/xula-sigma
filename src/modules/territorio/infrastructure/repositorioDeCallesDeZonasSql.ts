import { and, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { RepositorioDeCallesDeZonas } from "../application/puertosDeZonas";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import { calles, callesDeZonas, domicilios, lugares, zonas } from "./esquema";

/**
 * La raiz de cada domicilio sale de subir por `padre_id`, igual que en
 * `registroDeDomiciliosSql.ts`, que es donde esta la explicacion de por que
 * tres saltos alcanzan.
 */
const padre1 = alias(lugares, "padre1");
const padre2 = alias(lugares, "padre2");
const padre3 = alias(lugares, "padre3");

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
        raizId: sql<string>`COALESCE(${padre3.id}, ${padre2.id}, ${padre1.id}, ${lugares.id})`,
      })
      .from(callesDeZonas)
      .innerJoin(zonas, eq(zonas.id, callesDeZonas.zonaId))
      .innerJoin(domicilios, eq(domicilios.calleId, callesDeZonas.calleId))
      .innerJoin(calles, eq(calles.id, domicilios.calleId))
      .innerJoin(lugares, eq(lugares.id, domicilios.lugarId))
      .leftJoin(padre1, eq(padre1.id, lugares.padreId))
      .leftJoin(padre2, eq(padre2.id, padre1.padreId))
      .leftJoin(padre3, eq(padre3.id, padre2.padreId))
      .where(
        and(
          eq(callesDeZonas.zonaId, zonaId),
          isNull(zonas.bajaEn),
          isNull(domicilios.bajaEn),
        ),
      )
      .orderBy(lugares.nombre, calles.nombre, domicilios.numero, domicilios.id);

    return filas.map((fila) => ({
      ...fila,
      id: comoDomicilioId(fila.id),
      calleId: comoCalleId(fila.calleId),
      lugarId: comoLugarId(fila.lugarId),
      raizId: comoLugarId(fila.raizId),
    }));
  },
};
