import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  CambioDeCalle,
  EventoEstructuralDeCalle,
  LectorDeCallesDeMapa,
} from "../application/puertosDeLecturaDeCalles";
import {
  type CalleId,
  NATURALEZAS_ESTRUCTURALES,
  type NaturalezaEstructural,
  RANGO_DE_NATURALEZA,
} from "../domain";
import { calles, eventosDeCalles, lugares } from "./esquema";
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

/**
 * `lugar_anterior_id`/`lugar_nuevo_id` guardan la referencia, no el nombre:
 * el nombre sale de estos dos `LEFT JOIN`, que pasan por la politica de
 * tenant de `lugares` como cualquier otra lectura. Un id de otro municipio,
 * o de un lugar ya borrado, resuelve a `null` y el historial no lo inventa.
 */
const lugarAnterior = alias(lugares, "lugar_anterior");
const lugarNuevo = alias(lugares, "lugar_nuevo");

const columnasDeEvento = {
  id: eventosDeCalles.id,
  // `inArray` limita el resultado a las tres estructurales; el tipo lo
  // afirma para que `ALTA` no exista del lado del consumidor.
  naturaleza: sql<NaturalezaEstructural>`${eventosDeCalles.naturaleza}`,
  ocurridoEn: eventosDeCalles.ocurridoEn,
  nombreAnterior: eventosDeCalles.nombreAnterior,
  nombreNuevo: eventosDeCalles.nombreNuevo,
  latitudAnterior: eventosDeCalles.latitudAnterior,
  longitudAnterior: eventosDeCalles.longitudAnterior,
  latitudNueva: eventosDeCalles.latitudNueva,
  longitudNueva: eventosDeCalles.longitudNueva,
  lugarAnteriorId: eventosDeCalles.lugarAnteriorId,
  lugarNuevoId: eventosDeCalles.lugarNuevoId,
  lugarAnterior: lugarAnterior.nombre,
  lugarNuevo: lugarNuevo.nombre,
};

type FilaDeEvento = {
  id: string;
  naturaleza: NaturalezaEstructural;
  ocurridoEn: Date;
  nombreAnterior: string | null;
  nombreNuevo: string | null;
  latitudAnterior: number | null;
  longitudAnterior: number | null;
  latitudNueva: number | null;
  longitudNueva: number | null;
  lugarAnteriorId: string | null;
  lugarNuevoId: string | null;
  lugarAnterior: string | null;
  lugarNuevo: string | null;
};

const aPunto = (latitud: number | null, longitud: number | null) =>
  latitud === null || longitud === null ? null : { latitud, longitud };

/**
 * El payload existe por lo que la fila guarda, no por lo que el join
 * resolvio: un id de otro municipio, o de un lugar ya borrado, es un cambio
 * registrado con el nombre sin resolver, no un evento sin payload.
 */
const hayPayload = (fila: FilaDeEvento) =>
  fila.nombreAnterior !== null ||
  fila.nombreNuevo !== null ||
  fila.lugarAnteriorId !== null ||
  fila.lugarNuevoId !== null ||
  fila.latitudAnterior !== null ||
  fila.longitudAnterior !== null ||
  fila.latitudNueva !== null ||
  fila.longitudNueva !== null;

const aCambio = (fila: FilaDeEvento): CambioDeCalle | null =>
  hayPayload(fila)
    ? {
        nombre: { anterior: fila.nombreAnterior, nuevo: fila.nombreNuevo },
        punto: {
          anterior: aPunto(fila.latitudAnterior, fila.longitudAnterior),
          nuevo: aPunto(fila.latitudNueva, fila.longitudNueva),
        },
        lugar: { anterior: fila.lugarAnterior, nuevo: fila.lugarNuevo },
      }
    : null;

const aEventoEstructural = (fila: FilaDeEvento): EventoEstructuralDeCalle => ({
  id: fila.id,
  naturaleza: fila.naturaleza,
  ocurridoEn: fila.ocurridoEn,
  cambio: aCambio(fila),
});

const eventosEstructuralesDe = async (tx: TransaccionTenant, id: CalleId) => {
  const filas = await tx
    .select(columnasDeEvento)
    .from(eventosDeCalles)
    .leftJoin(
      lugarAnterior,
      eq(lugarAnterior.id, eventosDeCalles.lugarAnteriorId),
    )
    .leftJoin(lugarNuevo, eq(lugarNuevo.id, eventosDeCalles.lugarNuevoId))
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

  return filas.map(aEventoEstructural);
};

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

    return {
      ...aCalleGuardada(fila),
      eventos: await eventosEstructuralesDe(tx, id),
    };
  },
};
