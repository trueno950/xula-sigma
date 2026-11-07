import type { ContextoActual } from "@/shared/auth/contexto";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { CalleId } from "../domain";
import type { RepositorioDeCalles } from "./puertos";

/**
 * Lo que frena mover o dar de baja una calle, contado antes de ofrecerlo.
 * `zonas` cuenta tambien las zonas dadas de baja -su baja no borra
 * `calles_de_zonas`- y es lo que mira `reparentearCalle`; `zonasActivas`
 * es lo que mira `darDeBajaCalle`.
 */
export type UsoDeCalle = {
  readonly domicilios: number;
  readonly zonas: number;
  readonly zonasActivas: number;
};

type ContadorDeUsoDeCalle = Pick<
  RepositorioDeCalles,
  "contarDomiciliosQueLaUsan" | "contarZonasQueLaUsan"
> & {
  contarZonasActivasQueLaUsan(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<number>;
};

/**
 * Sin guarda de rol, mismo criterio que `contarContenidoDeLugares`: contar
 * no es escribir. Son las mismas cuentas que vuelven a pedir
 * `reparentearCalle` y `darDeBajaCalle` al escribir; esta lectura solo
 * decide que se ofrece, el rechazo sigue siendo de ellos.
 */
export function crearUsoDeCalle(repositorio: ContadorDeUsoDeCalle) {
  return function usoDeCalle(
    id: CalleId,
    contexto: ContextoActual,
  ): Promise<UsoDeCalle> {
    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const [domicilios, zonas, zonasActivas] = await Promise.all([
        repositorio.contarDomiciliosQueLaUsan(tx, id),
        repositorio.contarZonasQueLaUsan(tx, id),
        repositorio.contarZonasActivasQueLaUsan(tx, id),
      ]);

      return { domicilios, zonas, zonasActivas };
    });
  };
}
