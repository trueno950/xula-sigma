import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  AreaResponsable,
  EstadoDeReporte,
  MotivoDeRechazo,
  MovimientoId,
  ReporteId,
  TipoDeIncidencia,
} from "../domain";

/**
 * Lo que `registrarReporte` guarda en una sola fila (design.md seccion 10).
 * `lugarId`, `calleId` y `personaId` viajan como `string` y nunca como el id
 * marcado del modulo ajeno (design.md seccion 3): el dominio de `reportes` no
 * importa el de `territorio` ni el de `padron`.
 *
 * `estado` y `areaResponsable` viajan aca aunque siempre sean `"RECIBIDO"` y
 * `null` al alta: el paso 4c de design.md seccion 11 los pasa explicitos al
 * `guardar`, y la columna `estado` es NOT NULL sin default, asi que el
 * INSERT no se puede armar sin ellos. El resto del contrato de la tabla
 * (`motivoDeRechazo`, `duplicadoDeReporteId`) nace nulo y no viaja.
 */
export type DatosDeRegistroDeReporte = {
  id: ReporteId;
  ayuntamientoId: AyuntamientoId;
  folio: string;
  anio: number;
  consecutivo: number;
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  areaResponsable: AreaResponsable | null;
  lugarId: string;
  calleId: string | null;
  referencia: string | null;
  descripcion: string;
  personaId: string | null;
  registradoPorUsuarioId: string;
};

/** Lo que devuelve una lectura: los mismos campos mas lo que solo existe una vez guardada. */
export type ReporteGuardado = {
  id: ReporteId;
  folio: string;
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  areaResponsable: AreaResponsable | null;
  lugarId: string;
  calleId: string | null;
  referencia: string | null;
  descripcion: string;
  personaId: string | null;
  motivoDeRechazo: MotivoDeRechazo | null;
  duplicadoDeReporteId: string | null;
  registradoPorUsuarioId: string;
  registradoEn: Date;
  actualizadoEn: Date;
};

/** Lo minimo del candidato a original: un salto, no la fila entera (design.md seccion 8). */
export type CandidatoAOriginal = {
  id: ReporteId;
  duplicadoDeReporteId: string | null;
};

/** Lo que lee `paraConsultaPublica` para la superficie publica (design.md seccion 14). */
export type FilaParaConsultaPublica = {
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  registradoEn: Date;
  actualizadoEn: Date;
  duplicadoDeReporteId: string | null;
};

/** Lo que devuelve `similaresAbiertos` al alta (design.md seccion 13). */
export type ReporteSimilar = {
  id: ReporteId;
  folio: string;
  estado: EstadoDeReporte;
  descripcion: string;
  registradoEn: Date;
};

/** Filtros del listado del panel. `estado` y `tipo` opcionales; RLS acota el resto. */
export type FiltrosDeListado = {
  estado?: EstadoDeReporte;
  tipo?: TipoDeIncidencia;
};

/**
 * Puerto de escritura y lectura de `reportes`. Cada operacion recibe la
 * transaccion de `withTenant` por parametro y no la abre ella misma (mismo
 * criterio que `RepositorioDeConstancias`). El contrato se declara completo
 * aca aunque `cambiarEstadoDeReporte` (Fase 5) y `buscarReportesSimilares`
 * (Fase 7) sean quienes invoquen `candidatoAOriginal`/`aplicarTransicion`/
 * `asignarArea`/`similaresAbiertos`/`contarDuplicadosDe`/
 * `paraConsultaPublica*`; `repositorioDeReportesSql` los completa en esas
 * rebanadas sobre el mismo archivo (tasks.md 4.7).
 */
export type RepositorioDeReportes = {
  guardar(
    tx: TransaccionTenant,
    datos: DatosDeRegistroDeReporte,
  ): Promise<void>;
  buscarPorId(
    tx: TransaccionTenant,
    id: ReporteId,
  ): Promise<ReporteGuardado | null>;
  candidatoAOriginal(
    tx: TransaccionTenant,
    id: string,
  ): Promise<CandidatoAOriginal | null>;
  /** `false` cuando afecta cero filas: otra transaccion lo movio en el medio (design.md seccion 12). */
  aplicarTransicion(
    tx: TransaccionTenant,
    datos: {
      id: ReporteId;
      estadoAnterior: EstadoDeReporte;
      estadoNuevo: EstadoDeReporte;
      motivoDeRechazo: MotivoDeRechazo | null;
      duplicadoDeReporteId: string | null;
    },
  ): Promise<boolean>;
  asignarArea(
    tx: TransaccionTenant,
    datos: { id: ReporteId; areaResponsable: AreaResponsable },
  ): Promise<boolean>;
  listar(
    tx: TransaccionTenant,
    filtros: FiltrosDeListado,
  ): Promise<readonly ReporteGuardado[]>;
  similaresAbiertos(
    tx: TransaccionTenant,
    criterio: { lugarId: string; tipo: TipoDeIncidencia },
  ): Promise<readonly ReporteSimilar[]>;
  contarDuplicadosDe(tx: TransaccionTenant, id: ReporteId): Promise<number>;
  paraConsultaPublica(
    tx: TransaccionTenant,
    folio: string,
  ): Promise<FilaParaConsultaPublica | null>;
  paraConsultaPublicaPorId(
    tx: TransaccionTenant,
    id: string,
  ): Promise<FilaParaConsultaPublica | null>;
};

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
