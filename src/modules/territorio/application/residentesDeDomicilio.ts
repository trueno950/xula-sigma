import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId } from "../domain";
import type {
  LecturaDeResidentes,
  RepositorioDeResidencias,
  ResidenteDeDomicilio,
} from "./puertosDeResidencias";

/**
 * Quien vive hoy en un domicilio. Sin guarda de rol, mismo criterio que la
 * ficha de una persona: leer el padron no es escribirlo. Las residencias se
 * leen bajo `withTenant` -un domicilio de otro municipio no devuelve
 * filas- y los nombres despues, ya fuera de la transaccion, por el motivo
 * de `LecturaDePersonas`. Los datos viejos pueden tener abierta la
 * residencia de una identidad fusionada junto a la de su ganadora: se
 * agrupan por la terminal.
 */
export function crearResidentesDeDomicilio(
  repositorio: RepositorioDeResidencias,
  crearLecturaDeResidentes: (contexto: ContextoActual) => LecturaDeResidentes,
) {
  return async function residentesDeDomicilio(
    domicilioId: DomicilioId,
    contexto: ContextoActual,
  ): Promise<readonly ResidenteDeDomicilio[]> {
    const personaIds = await withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.residentesDe(tx, [domicilioId]),
    );
    const lectura = crearLecturaDeResidentes(contexto);
    const fichas = await Promise.all(
      personaIds.map((id) => lectura.residenteDe(id)),
    );
    const porTerminal = new Map<string, ResidenteDeDomicilio>();
    for (const ficha of fichas) {
      if (ficha) porTerminal.set(ficha.personaId, ficha);
    }

    return [...porTerminal.values()].sort((a, b) =>
      a.nombreCompleto.localeCompare(b.nombreCompleto, "es"),
    );
  };
}
