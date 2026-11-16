import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { EstadoDeReporte, MotivoDeRechazo, ReporteId } from "../domain";
import type { RepositorioDeReportes } from "./puertos";
import type { RegistroDeMovimientos } from "./puertosDeMovimientos";

/**
 * Todo lo que una transicion de reporte escribe, en la transaccion que ya
 * abrio quien la pide: la fila (`aplicarTransicion`), el movimiento
 * append-only con su estado anterior y el cambio de area, y la traza de
 * bitacora.
 *
 * Vive aparte de `cambiarEstadoDeReporte` porque hay dos caminos que mueven un
 * reporte -la operadora desde el detalle, y la obra que se finaliza sola (S3
 * de `intervenciones-trazabilidad`)- y las dos tienen que dejar el mismo
 * rastro. Lo que NO entra aca es `publicarActualizacion`: cada camino publica
 * una sola vez, al final del suyo.
 */
export type TransicionDeReporte = {
  repositorio: Pick<RepositorioDeReportes, "aplicarTransicion">;
  movimientos: Pick<RegistroDeMovimientos, "agregar">;
  tx: TransaccionTenant;
  contexto: ContextoActual;
  datos: {
    id: ReporteId;
    estadoAnterior: EstadoDeReporte;
    estadoNuevo: EstadoDeReporte;
    motivoDeRechazo: MotivoDeRechazo | null;
    duplicadoDeReporteId: string | null;
  };
};

export async function aplicarTransicionConMovimiento(
  transicion: TransicionDeReporte,
): Promise<void> {
  const { repositorio, movimientos, tx, contexto, datos } = transicion;

  const movio = await repositorio.aplicarTransicion(tx, datos);
  if (!movio) throw new NoEncontradoError();

  await movimientos.agregar(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    reporteId: datos.id,
    usuarioId: contexto.usuario.id,
    estadoAnterior: datos.estadoAnterior,
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
