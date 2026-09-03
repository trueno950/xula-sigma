import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  DuplicadoSinOriginalError,
  type EstadoDeReporte,
  esTerminal,
  type MotivoDeRechazo,
  ReporteCerradoError,
  type ReporteId,
  TransicionInvalidaError,
  transicionValida,
  vincularDuplicado,
} from "../domain";
import type {
  RegistroDeMovimientos,
  ReporteGuardado,
  RepositorioDeReportes,
} from "./puertos";

/** Lo que eligio el operador; NO es lo que se guarda (design.md seccion 8). */
export type EntradaDeCambioDeEstado = {
  id: ReporteId;
  estadoNuevo: EstadoDeReporte;
  motivoDeRechazo: MotivoDeRechazo | null;
  duplicadoDe: string | null;
};

/** `esTerminal`/`transicionValida` de design.md seccion 12, paso 2b. */
function validarTransicion(
  actual: Pick<ReporteGuardado, "estado">,
  estadoNuevo: EstadoDeReporte,
): void {
  if (esTerminal(actual.estado)) throw new ReporteCerradoError();
  if (!transicionValida(actual.estado, estadoNuevo)) {
    throw new TransicionInvalidaError();
  }
}

/** El par de reglas de design.md seccion 12, paso 2c: un solo motivo posible. */
function validarMotivo(
  estadoNuevo: EstadoDeReporte,
  motivoDeRechazo: MotivoDeRechazo | null,
): void {
  const exigeMotivo = estadoNuevo === "RECHAZADO";
  if (exigeMotivo === (motivoDeRechazo !== null)) return;

  throw new ValidacionError(
    {
      motivoDeRechazo: exigeMotivo
        ? "Rechazar exige un motivo."
        : "Solo aplica al rechazar.",
    },
    exigeMotivo
      ? "Rechazar un reporte exige un motivo."
      : "El motivo de rechazo solo aplica al rechazar.",
  );
}

/**
 * Resuelve el original antes de guardar (design.md seccion 8 y 12, paso
 * 2c-2d): `candidatoAOriginal` corre **dentro** de `tx` -si se leyera
 * afuera, otra transaccion podria marcar el candidato duplicado en el medio
 * y este UPDATE guardaria un vinculo a un duplicado-.
 */
async function resolverOriginal({
  repositorio,
  tx,
  reporteId,
  motivoDeRechazo,
  duplicadoDe,
}: {
  repositorio: Pick<RepositorioDeReportes, "candidatoAOriginal">;
  tx: TransaccionTenant;
  reporteId: ReporteId;
  motivoDeRechazo: MotivoDeRechazo | null;
  duplicadoDe: string | null;
}): Promise<string | null> {
  const exigeVinculo = motivoDeRechazo === "DUPLICADO";
  if (exigeVinculo !== (duplicadoDe !== null)) {
    throw new DuplicadoSinOriginalError();
  }
  if (!exigeVinculo || duplicadoDe === null) return null;

  const candidato = await repositorio.candidatoAOriginal(tx, duplicadoDe);
  if (!candidato) throw new NoEncontradoError();
  return vincularDuplicado(reporteId, candidato);
}

/**
 * Aplica la transicion y dejar su rastro: `aplicarTransicion`,
 * `movimientos.agregar` y `registrar` en la misma llamada (design.md
 * seccion 12, paso 2e-2f) -separado del cuerpo de `cambiarEstadoDeReporte`
 * solo por la metrica de lineas por funcion, no por una razon de diseño.
 */
async function confirmarTransicion({
  repositorio,
  movimientos,
  tx,
  contexto,
  datos,
  estadoAnterior,
  duplicadoDeReporteId,
}: {
  repositorio: Pick<RepositorioDeReportes, "aplicarTransicion">;
  movimientos: Pick<RegistroDeMovimientos, "agregar">;
  tx: TransaccionTenant;
  contexto: ContextoActual;
  datos: EntradaDeCambioDeEstado;
  estadoAnterior: EstadoDeReporte;
  duplicadoDeReporteId: string | null;
}): Promise<void> {
  const movio = await repositorio.aplicarTransicion(tx, {
    id: datos.id,
    estadoAnterior,
    estadoNuevo: datos.estadoNuevo,
    motivoDeRechazo: datos.motivoDeRechazo,
    duplicadoDeReporteId,
  });
  if (!movio) throw new NoEncontradoError();

  await movimientos.agregar(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    reporteId: datos.id,
    usuarioId: contexto.usuario.id,
    estadoAnterior,
    estadoNuevo: datos.estadoNuevo,
    areaAsignada: null,
    motivo: datos.motivoDeRechazo,
  });

  await registrar(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    actor: contexto.usuario.id,
    origen: contexto.origen,
    accion: "CAMBIAR_ESTADO_REPORTE",
    entidad: "reportes",
    entidadId: datos.id,
  });
}

/**
 * `cambiarEstadoDeReporte`: el orden exacto de design.md seccion 12.
 *
 * No hay caso de uso "marcar duplicado": el vinculo es un parametro mas de
 * la transicion, para que transicion, vinculo y movimiento confirmen o
 * fallen juntos.
 */
export function crearCambiarEstadoDeReporte({
  repositorio,
  movimientos,
}: {
  repositorio: Pick<
    RepositorioDeReportes,
    "buscarPorId" | "candidatoAOriginal" | "aplicarTransicion"
  >;
  movimientos: Pick<RegistroDeMovimientos, "agregar">;
}) {
  return async function cambiarEstadoDeReporte(
    datos: EntradaDeCambioDeEstado,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarReportes(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const actual = await repositorio.buscarPorId(tx, datos.id);
      if (!actual) throw new NoEncontradoError();

      validarTransicion(actual, datos.estadoNuevo);
      validarMotivo(datos.estadoNuevo, datos.motivoDeRechazo);
      const original = await resolverOriginal({
        repositorio,
        tx,
        reporteId: datos.id,
        motivoDeRechazo: datos.motivoDeRechazo,
        duplicadoDe: datos.duplicadoDe,
      });

      await confirmarTransicion({
        repositorio,
        movimientos,
        tx,
        contexto,
        datos,
        estadoAnterior: actual.estado,
        duplicadoDeReporteId: original,
      });
    });
  };
}
