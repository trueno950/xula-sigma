import type { PersonaId } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { hoyEnMerida } from "@/shared/lib/fecha";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId, ResidenciaId } from "../domain";
import type {
  LecturaDePersonas,
  RepositorioDeDomicilios,
  RepositorioDeResidencias,
} from "./puertos";

/**
 * `crearLecturaDePersonas` es una fabrica y no una instancia (design.md
 * seccion 6): se llama con el `contexto` de cada invocacion para construir
 * un `LecturaDePersonas` que ya trae el tenant cerrado, porque el puerto en
 * si no recibe `contexto` en su firma.
 */
export function crearRegistrarMudanza(
  repositorio: RepositorioDeResidencias,
  repositorioDeDomicilios: RepositorioDeDomicilios,
  crearLecturaDePersonas: (contexto: ContextoActual) => LecturaDePersonas,
) {
  return async function registrarMudanza(
    personaId: PersonaId,
    domicilioId: DomicilioId,
    contexto: ContextoActual,
  ): Promise<{ id: ResidenciaId }> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    /**
     * Fuera de la transaccion, a proposito (design.md seccion 6): un
     * `withTenant` anidado se traba en integracion (`DB_POOL_MAX=1`) y
     * consume dos conexiones del pool en produccion.
     */
    const lecturaDePersonas = crearLecturaDePersonas(contexto);
    const terminal = await lecturaDePersonas.terminalDe(personaId);
    if (!terminal) throw new NoEncontradoError();

    const hoy = hoyEnMerida();

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const domicilio = await repositorioDeDomicilios.buscarPorId(
        tx,
        domicilioId,
      );
      if (!domicilio) throw new NoEncontradoError();

      const cerrada = await repositorio.cerrarAbierta(tx, terminal, hoy);
      if (cerrada) {
        await registrar(tx, {
          ayuntamientoId: contexto.ayuntamientoId,
          actor: contexto.usuario.id,
          origen: contexto.origen,
          accion: "CERRAR_RESIDENCIA",
          entidad: "residencias",
          entidadId: cerrada,
        });
      }

      // Se guarda el terminal, no lo que mando la UI -mismo criterio que
      // `fusionarPersonas` (design.md seccion 8): mudar a alguien que ya
      // es perdedor desaparece sin rechazarlo.
      const id = await repositorio.abrir(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        personaId: terminal,
        domicilioId,
        desdeEn: hoy,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "ABRIR_RESIDENCIA",
        entidad: "residencias",
        entidadId: id,
      });

      return { id };
    });
  };
}
