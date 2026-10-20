import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { CalleId, LugarId, PuntoGeografico } from "../domain";

/**
 * Un evento estructural nuevo. El `ayuntamientoId` sale del contexto del
 * servidor y `ocurridoEn` lo asigna Postgres.
 */
export type EventoDeCalleNuevo = {
  ayuntamientoId: AyuntamientoId;
  calleId: CalleId;
};

/**
 * Un evento que cambio algo lleva el antes y el despues: el porque de
 * guardarlo en la fila del evento esta en `infrastructure/esquemaDeCalles.ts`.
 * Los dos lados son obligatorios para que nadie escriba medio cambio; solo
 * el punto admite `null`, porque una calle puede no tener punto.
 */
export type EventoDeRenombre = EventoDeCalleNuevo & {
  nombreAnterior: string;
  nombreNuevo: string;
};

export type EventoDeReparenteo = EventoDeCalleNuevo & {
  lugarAnteriorId: LugarId;
  lugarNuevoId: LugarId;
};

export type EventoDeUbicacion = EventoDeCalleNuevo & {
  puntoAnterior: PuntoGeografico | null;
  puntoNuevo: PuntoGeografico | null;
};
