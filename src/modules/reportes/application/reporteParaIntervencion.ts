import type { ContextoActual } from "@/shared/auth/contexto";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { comoReporteId, type EstadoDeReporte, esTerminal } from "../domain";
import type { RepositorioDeReportes } from "./puertos";
import type { RegistroDeMovimientos } from "./puertosDeMovimientos";
import { aplicarTransicionConMovimiento } from "./transicionDeReporte";
import { validarTransicion } from "./validacionDeCambioDeEstado";

/**
 * La cara de `reportes` que necesita una obra de `intervenciones` (S2 y S3 de
 * `intervenciones-trazabilidad`), siempre dentro de la transaccion de quien la
 * pide: programar obra mueve el reporte a `EN_ATENCION` en la misma
 * transaccion que crea la intervencion, y finalizarla lo cierra como
 * `RESUELTO` en la misma que la finaliza.
 *
 * No reusa `cambiarEstadoDeReporte` porque ese abre su propio `withTenant` y
 * repite el chequeo de rol: aca la autorizacion ya la decidio el caso de uso
 * de `intervenciones`, y una transaccion anidada partiria en dos lo que tiene
 * que confirmar junto.
 */

export type ReporteDeOrigen = {
  id: string;
  estado: EstadoDeReporte;
  lugarId: string;
  calleId: string | null;
};

export type EstadoDeReporteParaObra = "EN_ATENCION" | "RESUELTO";

export type ResultadoDeTransicionDeReporte =
  | "MOVIDO"
  | "SIN_CAMBIOS"
  | "CERRADO"
  | "AUSENTE";

export type ReporteParaIntervencion = {
  leer(
    tx: TransaccionTenant,
    reporteId: string,
  ): Promise<ReporteDeOrigen | null>;
  mover(
    tx: TransaccionTenant,
    datos: {
      reporteId: string;
      estadoNuevo: EstadoDeReporteParaObra;
      contexto: ContextoActual;
    },
  ): Promise<ResultadoDeTransicionDeReporte>;
};

export function crearReporteParaIntervencion({
  repositorio,
  movimientos,
}: {
  repositorio: Pick<RepositorioDeReportes, "buscarPorId" | "aplicarTransicion">;
  movimientos: Pick<RegistroDeMovimientos, "agregar">;
}): ReporteParaIntervencion {
  return {
    async leer(tx, reporteId) {
      const reporte = await repositorio.buscarPorId(
        tx,
        comoReporteId(reporteId),
      );
      if (!reporte) return null;

      return {
        id: reporte.id,
        estado: reporte.estado,
        lugarId: reporte.lugarId,
        calleId: reporte.calleId,
      };
    },

    async mover(tx, { reporteId, estadoNuevo, contexto }) {
      const reporte = await repositorio.buscarPorId(
        tx,
        comoReporteId(reporteId),
      );
      if (!reporte) return "AUSENTE";
      if (reporte.estado === estadoNuevo) return "SIN_CAMBIOS";
      if (esTerminal(reporte.estado)) return "CERRADO";
      // El mismo cuadro de transiciones que el camino manual de la operadora:
      // los dos estados que llegan por aca estan en la tabla, y si alguno
      // dejara de estarlo el rechazo es de dominio, no un UPDATE silencioso.
      validarTransicion(reporte, estadoNuevo);

      await aplicarTransicionConMovimiento({
        repositorio,
        movimientos,
        tx,
        contexto,
        datos: {
          id: reporte.id,
          estadoAnterior: reporte.estado,
          estadoNuevo,
          motivoDeRechazo: null,
          duplicadoDeReporteId: null,
        },
      });
      await publicarActualizacion(tx, contexto.ayuntamientoId, {
        tipo: "reporte",
        id: reporte.id,
        cambio: "estado",
      });

      return "MOVIDO";
    },
  };
}
