import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ReporteId } from "../domain";
import { fechaCivilDeInstante } from "./fechaCivil";
import type { RepositorioDeReportes } from "./puertos";
import type {
  CrearLecturaDeNombres,
  ReporteDeBandeja,
} from "./puertosDeUbicacionesDeReporte";
import { conUbicaciones } from "./ubicacionesDeReportes";

/** La fila del detalle: el reporte, donde ocurrio y la fecha civil del registro (S11). */
export type ReporteDeDetalle = ReporteDeBandeja & {
  /** `YYYY-MM-DD` en `America/Merida`: la fecha que se imprime, no la del proceso. */
  readonly fechaDeRegistro: string;
};

/**
 * `detalleDeReporte`: la lectura de `/reportes/detalle/[id]`. Sin guarda de
 * rol propia -leer no es escribir, mismo criterio que `reportePorId`-, y
 * `null` para un id inexistente o de otro tenant: quien decide que eso es un
 * 404 es el borde.
 *
 * La fecha de registro la formatea `fechaCivilDeInstante` y no la pantalla:
 * `shared/lib/fecha` resuelve el dia civil en Merida, y una pantalla que
 * restara horas a mano repetiria el error que esa funcion existe para evitar.
 */
export function crearDetalleDeReporte({
  repositorio,
  crearLecturaDeNombres,
}: {
  repositorio: Pick<RepositorioDeReportes, "buscarPorId">;
  crearLecturaDeNombres: CrearLecturaDeNombres;
}) {
  return async function detalleDeReporte(
    id: ReporteId,
    contexto: ContextoActual,
  ): Promise<ReporteDeDetalle | null> {
    const reporte = await withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.buscarPorId(tx, id),
    );
    if (!reporte) return null;

    const [detalle] = await conUbicaciones(
      [reporte],
      crearLecturaDeNombres,
      contexto,
    );
    if (!detalle) return null;

    return {
      ...detalle,
      fechaDeRegistro: fechaCivilDeInstante(detalle.registradoEn),
    };
  };
}
