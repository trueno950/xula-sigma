import type { AyuntamientoId } from "./ayuntamientoId";
import { bitacora } from "./esquema";
import type { TransaccionTenant } from "./withTenant";

/**
 * La unica forma de escribir en la bitacora de auditoria.
 *
 * Vive en `tenancy` y no en `auth` porque la bitacora es transversal: la
 * escriben constancias, apoyos y el juzgado, y ninguno de esos depende de
 * autenticacion. La direccion es `auth → tenancy`, asi que esto no puede
 * conocer `ContextoActual`; quien tiene el contexto arma la traza.
 *
 * Es delgado a proposito —envuelve un INSERT y nada mas— y aun asi tiene
 * que existir. Antes de este archivo habia tres escritores con tres formas
 * distintas de armar la misma fila: `provision.ts`, un `registrar` privado
 * de `administracionDeUsuarios.ts` y `scripts/restablecer-admin.sql`. Tres
 * copias de una regla divergen, y la que quede vieja no avisa.
 *
 * Que no lleva una traza: nombre, CURP, domicilio, motivo de traslado,
 * tipo de asunto del juzgado ni programa de apoyo. Solo ids. El
 * razonamiento completo esta en el ADR 0001 seccion 5 y no se repite aca.
 */

export type Traza = {
  ayuntamientoId: AyuntamientoId;
  /**
   * Nulo cuando la accion la origina el sistema y no una persona.
   *
   * Obligatorio aunque admita nulo, y eso es lo que aporta el tipo: un
   * campo opcional se omite sin que nada falle y la traza queda sin decir
   * quien la origino. Una bitacora es evidencia legal; un hueco ahi no se
   * puede reconstruir despues.
   */
  actor: string | null;
  /**
   * El "desde donde" que pide Fase 0. Hoy es `protocolo://host`, o sea la
   * superficie municipal por la que entro la peticion.
   *
   * Nulo por la misma razon que `actor`: hay caminos sin peticion HTTP
   * detras —una migracion, un script de mantenimiento— y ahi el valor
   * honesto es la ausencia, no un placeholder.
   */
  origen: string | null;
  accion: string;
  entidad: string;
  /** Ausente cuando la accion no recae sobre una fila concreta. */
  entidadId?: string | null;
};

/**
 * @param tx La transaccion de `withTenant`. La traza se escribe **adentro
 *   de la transaccion que la origino**: si la operacion falla y hace
 *   ROLLBACK, la traza se va con ella. Una bitacora que registra lo que no
 *   paso miente igual que una que omite lo que si.
 */
export const registrar = (tx: TransaccionTenant, traza: Traza) =>
  tx.insert(bitacora).values(traza);
