import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  AreaResponsable,
  EstadoDeReporte,
  MotivoDeRechazo,
  MovimientoId,
  ReporteId,
} from "../domain";

/**
 * Separado de `puertos.ts` por la metrica de lineas por archivo
 * (`AGENTS.md`): el contador de folios y el historial de movimientos son
 * un tema propio -otro regimen de permisos, otra tabla- y no el contrato
 * de escritura/lectura de `reportes` mismo.
 */

/**
 * El contador de folios (design.md seccion 4): una sola sentencia,
 * `ON CONFLICT (ayuntamiento_id, anio) DO UPDATE`, con el lock que garantiza
 * un consecutivo sin hueco y sin repeticion. Mismo mecanismo que
 * `constancias`, con una columna menos en la PK -la decision 2 cerro que no
 * se segmenta por tipo de incidencia-.
 */
export type ContadorDeFolios = {
  siguiente(
    tx: TransaccionTenant,
    datos: { ayuntamientoId: AyuntamientoId; anio: number },
  ): Promise<number>;
};

/**
 * Lo que `movimientos.agregar` persiste en una fila del historial. Sin `id`
 * ni `ocurridoEn`: los aporta la base (design.md seccion 10).
 */
export type DatosDeMovimiento = {
  ayuntamientoId: AyuntamientoId;
  reporteId: ReporteId;
  usuarioId: string;
  estadoAnterior: EstadoDeReporte | null;
  estadoNuevo: EstadoDeReporte | null;
  areaAsignada: AreaResponsable | null;
  motivo: MotivoDeRechazo | null;
};

/** Lo que devuelve `historialDe`: la fila completa, con su id y su momento. */
export type MovimientoGuardado = DatosDeMovimiento & {
  id: MovimientoId;
  ocurridoEn: Date;
};

/**
 * `RegistroDeMovimientos` es puerto propio y no un metodo del repositorio
 * (design.md seccion 10): la tabla tiene otro regimen de permisos -solo
 * agregado, seccion 6- y separarlo lo deja escrito en el tipo. `historialDe`
 * ordena por `ocurridoEn ASC` y ese orden es parte del contrato.
 */
export type RegistroDeMovimientos = {
  agregar(tx: TransaccionTenant, datos: DatosDeMovimiento): Promise<void>;
  historialDe(
    tx: TransaccionTenant,
    reporteId: ReporteId,
  ): Promise<readonly MovimientoGuardado[]>;
};
