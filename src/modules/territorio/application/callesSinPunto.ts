import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type {
  CalleSinPunto,
  LectorDeCallesSinPunto,
} from "./puertosDeLecturaDeCalles";

/**
 * S3 de `gestion-municipal`: las calles activas que no tienen punto, cada una
 * con la raiz de su territorio, para que el mapa diga cuantas le faltan a
 * cada localidad y enlace a la calle para ubicarla.
 *
 * Sin guarda de rol a proposito, mismo criterio que `callesParaMapa`: leer el
 * mapa no es administrar la estructura. El tenant sale del contexto del
 * servidor.
 */
export function crearCallesSinPunto(lector: LectorDeCallesSinPunto) {
  return function callesSinPunto(
    contexto: ContextoActual,
  ): Promise<readonly CalleSinPunto[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      lector.listarSinPunto(tx),
    );
  };
}
