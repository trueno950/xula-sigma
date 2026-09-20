import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { hoyEnMerida } from "@/shared/lib/fecha";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId, ResidenciaId } from "../domain";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";
import type {
  LecturaDePersonas,
  RepositorioDeResidencias,
} from "./puertosDeResidencias";

/** Datos de `escribirMudanza`, agrupados para no superar 3 parametros por funcion (metrica de `AGENTS.md`; `tx` va aparte, mismo criterio que los repositorios). */
type DatosDeEscrituraDeMudanza = {
  repositorio: RepositorioDeResidencias;
  repositorioDeDomicilios: RepositorioDeDomicilios;
  terminal: string;
  domicilioId: DomicilioId;
  hoy: string;
  contexto: ContextoActual;
};

/**
 * Cuerpo de la transaccion, separado de `registrarMudanza` (limite de
 * `AGENTS.md`, lineas por funcion): domicilio invalido, cierre de la
 * residencia previa si habia una, y apertura de la nueva, cada escritura
 * con su propia traza.
 */
async function escribirMudanza(
  tx: TransaccionTenant,
  datos: DatosDeEscrituraDeMudanza,
): Promise<{ id: ResidenciaId }> {
  const {
    repositorio,
    repositorioDeDomicilios,
    terminal,
    domicilioId,
    hoy,
    contexto,
  } = datos;

  /**
   * `bloquearPorId`, no `buscarPorId`: una baja concurrente toma el mismo
   * lock antes de decidir si hay residentes. Sin compartir el lock, la
   * mudanza podia leer "activo" antes de que la baja terminara y escribir
   * la residencia igual despues, aunque la baja ya hubiera ganado la
   * carrera -`residencias_domicilio_tenant_fk` hace esperar el INSERT,
   * pero la decision ya estaba tomada con datos viejos.
   */
  const domicilio = await repositorioDeDomicilios.bloquearPorId(
    tx,
    domicilioId,
  );
  if (!domicilio || domicilio.bajaEn !== null) throw new NoEncontradoError();

  const trazar = (accion: string, entidadId: ResidenciaId) =>
    registrar(tx, {
      ayuntamientoId: contexto.ayuntamientoId,
      actor: contexto.usuario.id,
      origen: contexto.origen,
      accion,
      entidad: "residencias",
      entidadId,
    });

  const cerrada = await repositorio.cerrarAbierta(tx, terminal, hoy);
  if (cerrada) await trazar("CERRAR_RESIDENCIA", cerrada);

  // Se guarda el terminal, no lo que mando la UI -mismo criterio que
  // `fusionarPersonas` (design.md seccion 8): mudar a alguien que ya es
  // perdedor desaparece sin rechazarlo.
  const id = await repositorio.abrir(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    personaId: terminal,
    domicilioId,
    desdeEn: hoy,
  });
  await trazar("ABRIR_RESIDENCIA", id);

  return { id };
}

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
    personaId: string,
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

    return withTenant(contexto.ayuntamientoId, (tx) =>
      escribirMudanza(tx, {
        repositorio,
        repositorioDeDomicilios,
        terminal,
        domicilioId,
        hoy,
        contexto,
      }),
    );
  };
}
