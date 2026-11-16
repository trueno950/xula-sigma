import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  esUmbralDeAtraso,
  UMBRAL_DE_ATRASO_MAXIMO,
  UMBRAL_DE_ATRASO_MINIMO,
} from "../domain";
import type { RepositorioDeConfiguracionDeReportes } from "./puertosDeConfiguracion";

const MENSAJE_FUERA_DE_RANGO = `El umbral va de ${UMBRAL_DE_ATRASO_MINIMO} a ${UMBRAL_DE_ATRASO_MAXIMO} días.`;

/**
 * Cambia el umbral de atraso del municipio del contexto.
 *
 * Exige `puedeAdministrarReportes` -el mismo permiso con el que se decide
 * quien responde por un reporte-, no `puedeEscribir`: la captura de
 * mostrador no configura la bandeja. El `ayuntamiento_id` sale del contexto
 * del servidor y nunca de la entrada; el borde -la Server Action- valida la
 * forma y esta funcion el rango, porque un caso de uso tambien se invoca
 * desde una prueba o desde otra pantalla.
 */
export function crearCambiarUmbralDeAtraso(
  repositorio: Pick<RepositorioDeConfiguracionDeReportes, "escribir">,
) {
  return async function cambiarUmbralDeAtraso(
    diasDeAtraso: number,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarReportes(contexto.usuario.rol))
      throw new NoAutorizadoError();

    if (!esUmbralDeAtraso(diasDeAtraso))
      throw new ValidacionError({ diasDeAtraso: MENSAJE_FUERA_DE_RANGO });

    await withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.escribir(tx, contexto.ayuntamientoId, diasDeAtraso),
    );
  };
}
