import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { AreaResponsable } from "../domain";
import { esTerminal, ReporteCerradoError, type ReporteId } from "../domain";
import type { RegistroDeMovimientos, RepositorioDeReportes } from "./puertos";

export type EntradaDeAsignacionDeArea = {
  id: ReporteId;
  areaResponsable: AreaResponsable;
};

/**
 * `asignarAreaDeReporte`: mismo esqueleto de `cambiarEstadoDeReporte`, mas
 * corto -sin motivo ni vinculo de duplicado- (design.md seccion 12). La fila
 * de movimiento nace con `estadoAnterior`/`estadoNuevo` nulos: es el CHECK
 * `movimientos_no_vacio` el que exige que `areaAsignada` no sea el cuarto
 * nulo.
 */
export function crearAsignarAreaDeReporte({
  repositorio,
  movimientos,
}: {
  repositorio: Pick<RepositorioDeReportes, "buscarPorId" | "asignarArea">;
  movimientos: Pick<RegistroDeMovimientos, "agregar">;
}) {
  return async function asignarAreaDeReporte(
    datos: EntradaDeAsignacionDeArea,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarReportes(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const actual = await repositorio.buscarPorId(tx, datos.id);
      if (!actual) throw new NoEncontradoError();
      if (esTerminal(actual.estado)) throw new ReporteCerradoError();

      const asignado = await repositorio.asignarArea(tx, {
        id: datos.id,
        areaResponsable: datos.areaResponsable,
      });
      if (!asignado) throw new NoEncontradoError();

      await movimientos.agregar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        reporteId: datos.id,
        usuarioId: contexto.usuario.id,
        estadoAnterior: null,
        estadoNuevo: null,
        areaAsignada: datos.areaResponsable,
        motivo: null,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "ASIGNAR_AREA_REPORTE",
        entidad: "reportes",
        entidadId: datos.id,
      });
    });
  };
}
