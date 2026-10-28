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
  bajaEn: Date | null;
};

/**
 * Entrada de `actualizar`: las columnas mutables de una direccion, incluida
 * `bajaEn` — la correccion la reenvia tal como estaba y la baja la escribe.
 */
export type DatosDeActualizacionDeDomicilio = {
  id: DomicilioId;
  lugarId: LugarId;
  calleId: CalleId;
  numero: string | null;
  entreCalleAId: CalleId | null;
  entreCalleBId: CalleId | null;
  referencia: string | null;
  bajaEn: Date | null;
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
  /** La calle por id: dos calles del mismo nombre no son la misma calle. */
  calleId: CalleId;
  numero: string | null;
  lugar: string;
};

export type FiltrosDeRegistro = {
  readonly raizId?: LugarId;
  readonly calle?: string;
  readonly numero?: string;
  readonly busqueda?: string;
};

export type OpcionesDeRegistro = {
  readonly limite: number;
  readonly filtros: FiltrosDeRegistro;
};

export type DomicilioDelRegistro = {
  id: DomicilioId;
  calle: string;
  calleId: CalleId;
  numero: string | null;
  lugar: string;
  lugarId: LugarId;
  /**
   * El asentamiento del que cuelga el lugar del domicilio. Viaja en la fila
   * porque el registro sin filtro no tiene `?raiz=` de donde sacarlo, y es
   * la pantalla desde la que se entra a buscar un domicilio: sin este dato
   * la fila no podia ofrecer su enlace.
   */
  raizId: LugarId;
  /** Nombre de la raiz, presente en el registro del selector de reportes. */
  raiz?: string;
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
   * insertar la residencia -mismo motivo que `RepositorioDeCalles.bloquearPorId`
   * en `altaDeDomicilio` (hallazgo de GGA en la revision de PR 30): sin
   * este chequeo, un `domicilioId` de otro tenant o inexistente cae en el
   * `23503` crudo de `residencias_domicilio_tenant_fk` en vez de un
   * `NoEncontradoError` limpio. Un domicilio dado de baja tampoco aparece:
   * no es una direccion asignable.
   */
  buscarPorId(
    tx: TransaccionTenant,
    id: DomicilioId,
  ): Promise<DomicilioGuardado | null>;
  /** Igual que `buscarPorId`, pero con `SELECT ... FOR UPDATE` para escrituras serializadas. */
  bloquearPorId(
    tx: TransaccionTenant,
    id: DomicilioId,
  ): Promise<DomicilioGuardado | null>;
  /** `null` si el `UPDATE` afecto cero filas; el porque esta en `darDeBajaCalle` (`puertos.ts`). */
  actualizar(
    tx: TransaccionTenant,
    datos: DatosDeActualizacionDeDomicilio,
  ): Promise<DomicilioGuardado | null>;
  porLugarYSubarbol(
    tx: TransaccionTenant,
    lugarId: LugarId,
  ): Promise<readonly DomicilioGuardado[]>;
  porCalle(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<readonly DomicilioGuardado[]>;
  registro(
    tx: TransaccionTenant,
    opciones: OpcionesDeRegistro,
  ): Promise<readonly DomicilioDelRegistro[]>;
  /** Solo para el select de `FormularioDeMudanza`; no es el registro plano paginado. */
  listar(tx: TransaccionTenant): Promise<readonly DomicilioParaListado[]>;
};
