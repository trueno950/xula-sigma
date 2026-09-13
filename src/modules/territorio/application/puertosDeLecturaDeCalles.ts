import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, NaturalezaEstructural } from "../domain";
import type { CalleGuardada } from "./puertos";

/**
 * Un evento del contrato de `callePorId`. La naturaleza es la estructural:
 * `ALTA` no entra a la linea de tiempo y por eso no existe en este tipo.
 */
export type EventoEstructuralDeCalle = {
  id: string;
  naturaleza: NaturalezaEstructural;
  ocurridoEn: Date;
};

export type CalleConEventos = CalleGuardada & {
  eventos: readonly EventoEstructuralDeCalle[];
};

/**
 * Lado de lectura de calles: alimenta el mapa y la linea de tiempo. No
 * exige `puedeAdministrarTerritorio` -leer no es administrar-; el tenant
 * sale del contexto del servidor y RLS cierra el resto. Nunca lee
 * descripciones, referencias, domicilios, `bitacora` ni
 * `movimientos_de_reportes`.
 */
export type LectorDeCallesDeMapa = {
  /** Todas las calles del tenant, incluidas las de baja y las que no tienen punto. */
  listarParaMapa(tx: TransaccionTenant): Promise<readonly CalleGuardada[]>;
  /** Estado vigente de una calle -incluida su baja- mas sus eventos estructurales. */
  leerConEventos(
    tx: TransaccionTenant,
    id: CalleId,
  ): Promise<CalleConEventos | null>;
};
