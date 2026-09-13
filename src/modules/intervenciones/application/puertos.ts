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

export type IntervencionParaHistorial = Pick<
  IntervencionGuardada,
  "id" | "fechaDeOcurrencia"
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
