import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId, PartesDeDireccion } from "../domain";

/**
 * `LectorDeDirecciones` **si** recibe `tx` -a diferencia de
 * `LecturaDePersonas` (`puertosDeResidencias.ts`)-: su implementacion vive
 * en el mismo modulo y en la misma transaccion que `direccionVigenteDePersona`
 * abre. El `tx` en la firma de un puerto no es estilo: marca si el
 * adaptador cruza o no un limite de modulo (design.md seccion 7).
 *
 * Devuelve `null` cuando el domicilio no existe o RLS lo esconde -las dos
 * cosas se ven igual del lado de quien pregunta-, nunca lanza: mismo
 * criterio que `RepositorioDeLugares.buscarPorId`.
 */
export type LectorDeDirecciones = {
  partesDe(
    tx: TransaccionTenant,
    domicilioId: DomicilioId,
  ): Promise<PartesDeDireccion | null>;
};
