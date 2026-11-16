import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  EstadoDeIntervencion,
  IntervencionId,
  TipoDeIntervencion,
} from "../domain";

export type DatosDeRegistroDeIntervencion = {
  id: IntervencionId;
  ayuntamientoId: AyuntamientoId;
  tipo: TipoDeIntervencion;
  estado: EstadoDeIntervencion;
  fechaDeOcurrencia: string;
  lugarId: string;
  calleId: string | null;
  reporteId: string | null;
  descripcion: string;
  registradoPorUsuarioId: string;
};

export type IntervencionGuardada = Omit<
  DatosDeRegistroDeIntervencion,
  "ayuntamientoId"
> & {
  capturadoEn: Date;
  actualizadoEn: Date;
};

/**
 * Lo que `historial-de-calle` lee de una intervencion (S5 de
 * `intervenciones-trazabilidad`): ademas de cuando ocurrio, que trabajo fue,
 * como termino y que reporte lo origino, que es lo que la linea de tiempo
 * necesita para decir «Bache · finalizada · 12 nov 2026» y enlazar al origen.
 */
export type IntervencionParaHistorial = Pick<
  IntervencionGuardada,
  "id" | "fechaDeOcurrencia" | "tipo" | "estado" | "reporteId"
>;

export type ValoresAnterioresDeIntervencion = Pick<
  IntervencionGuardada,
  | "tipo"
  | "estado"
  | "fechaDeOcurrencia"
  | "lugarId"
  | "calleId"
  | "reporteId"
  | "descripcion"
>;
export type CamposDeCorreccionDeIntervencion = Omit<
  ValoresAnterioresDeIntervencion,
  "estado"
>;

export type DatosDeCorreccionDeIntervencion = {
  id: IntervencionId;
  ayuntamientoId: AyuntamientoId;
  usuarioId: string;
  cambios: CamposDeCorreccionDeIntervencion;
};

export type RepositorioDeIntervenciones = {
  guardar(
    tx: TransaccionTenant,
    datos: DatosDeRegistroDeIntervencion,
  ): Promise<void>;
  buscarPorId(
    tx: TransaccionTenant,
    id: IntervencionId,
  ): Promise<IntervencionGuardada | null>;
  corregir(
    tx: TransaccionTenant,
    datos: DatosDeCorreccionDeIntervencion,
  ): Promise<boolean>;
  aplicarTransicion(
    tx: TransaccionTenant,
    datos: {
      id: IntervencionId;
      estadoAnterior: EstadoDeIntervencion;
      estadoNuevo: EstadoDeIntervencion;
    },
  ): Promise<boolean>;
  listarPorCalle(
    tx: TransaccionTenant,
    calleId: string,
  ): Promise<readonly IntervencionParaHistorial[]>;
};
