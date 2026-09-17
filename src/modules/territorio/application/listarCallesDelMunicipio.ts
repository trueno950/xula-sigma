import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { CalleGuardada, RepositorioDeLugares } from "./puertos";
import type { LectorDeCallesDeMapa } from "./puertosDeLecturaDeCalles";

/** Una calle activa con el nombre del asentamiento que la contiene. */
export type CalleDelMunicipio = CalleGuardada & { asentamiento: string };

/**
 * Las calles activas del municipio, rotuladas con su asentamiento: alimenta
 * el alta de domicilio desde la entrada, donde el operador no tiene por que
 * saber que nodo es dueno de cada calle. Sin guarda de rol, mismo criterio
 * que `listarCalles`: leer el catalogo no es administrarlo.
 */
export function crearListarCallesDelMunicipio(
  lector: LectorDeCallesDeMapa,
  repositorioDeLugares: RepositorioDeLugares,
) {
  return function listarCallesDelMunicipio(
    contexto: ContextoActual,
  ): Promise<readonly CalleDelMunicipio[]> {
    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const calles = await lector.listarParaMapa(tx);
      const lugares = await repositorioDeLugares.listarLugares(tx);
      const nombres = new Map<string, string>(
        lugares.map((lugar) => [lugar.id, lugar.nombre]),
      );

      // `listarLugares` deja fuera los lugares de baja: una calle ahi no
      // tiene asentamiento activo que la rotule ni que la reciba.
      return calles
        .filter((calle) => calle.bajaEn === null)
        .flatMap((calle) => {
          const asentamiento = nombres.get(calle.lugarId);
          return asentamiento ? [{ ...calle, asentamiento }] : [];
        })
        .sort(
          (a, b) =>
            a.asentamiento.localeCompare(b.asentamiento) ||
            a.nombre.localeCompare(b.nombre),
        );
    });
  };
}
