import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, DomicilioId, LugarId } from "../domain";

export type DatosDeAltaDeDomicilio = {
  id: DomicilioId;
  ayuntamientoId: AyuntamientoId;
  lugarId: LugarId;
  calleId: CalleId;
  numero: string | null;
  entreCalleAId: CalleId | null;
  entreCalleBId: CalleId | null;
  referencia: string | null;
};

export type DomicilioGuardado = {
  id: DomicilioId;
  lugarId: LugarId;
  calleId: CalleId;
  numero: string | null;
  entreCalleAId: CalleId | null;
  entreCalleBId: CalleId | null;
  referencia: string | null;
};

/**
 * Fila plana del listado de domicilios del municipio, con los nombres ya
 * resueltos para la etiqueta de un `<select>` (`calle` y `lugar`). Sin
 * `bajaEn`: el listado alimenta `FormularioDeMudanza`, y un domicilio
 * sigue siendo asignable aunque su calle este de baja.
 */
export type DomicilioParaListado = {
  id: DomicilioId;
  calle: string;
  numero: string | null;
  lugar: string;
};

/**
 * `porLugarYSubarbol` reusa el mismo `WITH RECURSIVE` que
 * `RepositorioDeLugares.subarbol` (tasks.md 3.12), pero devuelve el detalle
 * completo del domicilio en vez del nodo minimo del arbol. `porCalle` no
 * necesita CTE: `calleId` ya identifica la fila sin bajar por jerarquia
 * (design.md seccion 12, "POR CALLE").
 */
export type RepositorioDeDomicilios = {
  crear(tx: TransaccionTenant, datos: DatosDeAltaDeDomicilio): Promise<void>;
  /**
   * `registrarMudanza` la usa para validar `domicilioId` bajo RLS antes de
   * insertar la residencia -mismo motivo que `RepositorioDeCalles.buscarPorId`
   * en `altaDeDomicilio` (hallazgo de GGA en la revision de PR 30): sin
   * este chequeo, un `domicilioId` de otro tenant o inexistente cae en el
   * `23503` crudo de `residencias_domicilio_tenant_fk` en vez de un
   * `NoEncontradoError` limpio.
   */
  buscarPorId(
    tx: TransaccionTenant,
    id: DomicilioId,
  ): Promise<DomicilioGuardado | null>;
  porLugarYSubarbol(
    tx: TransaccionTenant,
    lugarId: LugarId,
  ): Promise<readonly DomicilioGuardado[]>;
  porCalle(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<readonly DomicilioGuardado[]>;
  /** Todos los domicilios del tenant, con nombres resueltos, ordenados por lugar, calle y numero. */
  listar(tx: TransaccionTenant): Promise<readonly DomicilioParaListado[]>;
};
