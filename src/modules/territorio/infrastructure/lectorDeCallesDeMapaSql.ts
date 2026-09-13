import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { LectorDeCallesDeMapa } from "../application/puertosDeLecturaDeCalles";
import {
  NATURALEZAS_ESTRUCTURALES,
  type NaturalezaEstructural,
  RANGO_DE_NATURALEZA,
} from "../domain";
import { calles, eventosDeCalles } from "./esquema";
import { aCalleGuardada, columnasDeLecturaDeCalle } from "./lecturaDeCalle";

/**
 * El `CASE` traduce el rango fijo del contrato (`RANGO_DE_NATURALEZA`) a
 * SQL: el desempate no depende del orden fisico de Postgres.
 */
const ordenDeNaturaleza = sql`CASE ${eventosDeCalles.naturaleza} ${sql.join(
  NATURALEZAS_ESTRUCTURALES.map(
    (naturaleza) =>
      sql`WHEN ${naturaleza} THEN ${RANGO_DE_NATURALEZA[naturaleza]}`,
  ),
  sql` `,
)} END`;

export const lectorDeCallesDeMapaSql: LectorDeCallesDeMapa = {
  async listarParaMapa(tx) {
    const filas = await tx.select(columnasDeLecturaDeCalle).from(calles);

    return filas.map(aCalleGuardada);
  },

  async leerConEventos(tx, id) {
    const [fila] = await tx
      .select(columnasDeLecturaDeCalle)
      .from(calles)
      .where(eq(calles.id, id));
    if (!fila) return null;

    const eventos = await tx
      .select({
        id: eventosDeCalles.id,
        // `inArray` limita el resultado a las tres estructurales; el tipo
        // lo afirma para que `ALTA` no exista del lado del consumidor.
        naturaleza: sql<NaturalezaEstructural>`${eventosDeCalles.naturaleza}`,
        ocurridoEn: eventosDeCalles.ocurridoEn,
      })
      .from(eventosDeCalles)
      .where(
        and(
          eq(eventosDeCalles.calleId, id),
          inArray(eventosDeCalles.naturaleza, [...NATURALEZAS_ESTRUCTURALES]),
        ),
      )
      .orderBy(
        desc(eventosDeCalles.ocurridoEn),
        ordenDeNaturaleza,
        asc(eventosDeCalles.id),
      );

    return { ...aCalleGuardada(fila), eventos };
  },
};
