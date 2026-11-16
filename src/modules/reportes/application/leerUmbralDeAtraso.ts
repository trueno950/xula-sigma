import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import { UMBRAL_DE_ATRASO_POR_DEFECTO } from "../domain";
import type { RepositorioDeConfiguracionDeReportes } from "./puertosDeConfiguracion";

/**
 * Lee el umbral de atraso del municipio del contexto. Sin guarda de rol
 * propia: la bandeja lo necesita para pintar la insignia y la ve cualquier
 * rol que pueda leer reportes -leer no es configurar-, mismo criterio que
 * `documentosDelAyuntamiento`.
 */
export function crearLeerUmbralDeAtraso(
  repositorio: Pick<RepositorioDeConfiguracionDeReportes, "leer">,
) {
  return async function leerUmbralDeAtraso(
    contexto: ContextoActual,
  ): Promise<number> {
    const guardado = await withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.leer(tx, contexto.ayuntamientoId),
    );

    return guardado ?? UMBRAL_DE_ATRASO_POR_DEFECTO;
  };
}
