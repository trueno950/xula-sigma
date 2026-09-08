import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  CalleId,
  DomicilioId,
  LugarId,
  PuntoGeografico,
  TipoDeLugar,
} from "../domain";

export type DatosDeAltaDeLugar = {
  id: LugarId;
  ayuntamientoId: AyuntamientoId;
  tipo: TipoDeLugar;
  nombre: string;
  padreId: LugarId | null;
};

export type LugarGuardado = {
  id: LugarId;
  tipo: TipoDeLugar;
  nombre: string;
  padreId: LugarId | null;
  bajaEn: Date | null;
};

/**
 * Entrada de `actualizar`: siempre las cuatro columnas mutables, nunca
 * `tipo`. Un solo metodo de escritura para `editarLugar` (cambia `nombre`),
 * `darDeBajaLugar` (cambia `bajaEn`) y `reparentearLugar` (cambia
 * `padreId`) — cada uno relee el resto de la fila con `buscarPorId` antes
 * de llamar y lo reenvia sin tocarlo. Evita tres metodos de escritura en
 * el puerto para tres `UPDATE` de una sola fila que ya cubre el mismo
 * camino.
 */
export type DatosDeActualizacionDeLugar = {
  id: LugarId;
  nombre: string;
  padreId: LugarId | null;
  bajaEn: Date | null;
};

/**
 * `DatosDeEdicionDeLugar` **no tiene `tipo`** (design.md seccion 7, "`tipo`
 * es inmutable despues del alta"): si el caso de uso pudiera recibirlo,
 * podria invertir una arista existente sin pasar por `puedeContener`. Se
 * cierra por tipo, no por validacion en runtime.
 */
export type DatosDeEdicionDeLugar = {
  id: LugarId;
  nombre: string;
};

/**
 * Una fila del subarbol de `raizId`: un lugar descendiente (cualquier
 * profundidad, `raizId` mismo excluido) o un domicilio colgado de `raizId`
 * o de cualquiera de sus descendientes (design.md seccion 12, "SUBARBOL").
 * Union discriminada y no dos arreglos separados porque el consumidor —el
 * arbol de la UI (tasks.md 3.20)— recorre ambas clases en el mismo orden
 * de aparicion para anidar domicilios bajo el nodo que los contiene.
 */
export type NodoDeSubarbol =
  | {
      clase: "lugar";
      id: LugarId;
      tipo: TipoDeLugar;
      nombre: string;
      padreId: LugarId | null;
    }
  | { clase: "domicilio"; id: DomicilioId; lugarId: LugarId };

/**
 * Lo que los casos de uso de lugares necesitan de `infrastructure`, sin
 * componer SQL a mano (antipatron 7 de `AGENTS.md`). Todos reciben la
 * transaccion de `withTenant` por parametro: la escritura y el `registrar`
 * de bitacora del caso de uso confirman juntos o fallan juntos.
 */
export type RepositorioDeLugares = {
  crear(tx: TransaccionTenant, datos: DatosDeAltaDeLugar): Promise<void>;
  buscarPorId(
    tx: TransaccionTenant,
    id: LugarId,
  ): Promise<LugarGuardado | null>;
  actualizar(
    tx: TransaccionTenant,
    datos: DatosDeActualizacionDeLugar,
  ): Promise<void>;
  /** Hijos directos con `bajaEn IS NULL`. `darDeBajaLugar` la usa para rechazar la baja. */
  contarHijosActivos(tx: TransaccionTenant, lugarId: LugarId): Promise<number>;
  /** Domicilios con `lugarId` igual a este lugar exacto, sin bajar por sus descendientes. */
  contarDomiciliosColgados(
    tx: TransaccionTenant,
    lugarId: LugarId,
  ): Promise<number>;
  subarbol(
    tx: TransaccionTenant,
    raizId: LugarId,
  ): Promise<readonly NodoDeSubarbol[]>;
  /** Lugares de nivel superior activos (`padreId IS NULL`, `bajaEn IS NULL`), para la entrada de `/territorio`. */
  listarRaices(tx: TransaccionTenant): Promise<readonly LugarGuardado[]>;
  /** Todos los lugares activos (`bajaEn IS NULL`), raices y anidados, para el catalogo de "lugar padre" del alta. */
  listarLugares(tx: TransaccionTenant): Promise<readonly LugarGuardado[]>;
};

export type DatosDeAltaDeCalle = {
  id: CalleId;
  ayuntamientoId: AyuntamientoId;
  nombre: string;
  lugarId: LugarId;
};

export type CalleGuardada = {
  id: CalleId;
  nombre: string;
  lugarId: LugarId;
  punto: PuntoGeografico | null;
  bajaEn: Date | null;
};

export type DatosDeActualizacionDeCalle = {
  id: CalleId;
  nombre: string;
  lugarId: LugarId;
  punto: PuntoGeografico | null;
  bajaEn: Date | null;
};

/**
 * `actualizar` devuelve la fila actualizada o `null` si el `UPDATE` afecto
 * cero filas -id inexistente o de otro tenant, RLS ya lo esconde-. De ahi
 * sale `NoEncontradoError` en `renombrarCalle` sin necesitar `buscarPorId`
 * (tasks.md 4.1). `buscarPorId` si hace falta en otro caso de uso que solo
 * necesita leer -`altaDeDomicilio` valida `calleId` bajo RLS antes de
 * insertar, mismo motivo que `RepositorioDeLugares.buscarPorId`-. `crear`
 * y `actualizar` pueden lanzar `NombreDeCalleDuplicadoError`; el porque
 * esta en `domain/errores.ts`, unico lugar que lo explica.
 */
export type RepositorioDeCalles = {
  crear(tx: TransaccionTenant, datos: DatosDeAltaDeCalle): Promise<void>;
  buscarPorId(
    tx: TransaccionTenant,
    id: CalleId,
  ): Promise<CalleGuardada | null>;
  actualizar(
    tx: TransaccionTenant,
    datos: DatosDeActualizacionDeCalle,
  ): Promise<CalleGuardada | null>;
  contarDomiciliosQueLaUsan(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<number>;
  /** Calles activas (`bajaEn IS NULL`) de un lugar, para el catalogo y `SelectorDeCalle`. */
  listarPorLugar(
    tx: TransaccionTenant,
    lugarId: LugarId,
  ): Promise<readonly CalleGuardada[]>;
};

/**
 * Los puertos de domicilios viven en `puertosDeDomicilios.ts`, y los de
 * residencias en `puertosDeResidencias.ts`, no aca (hallazgo de GGA en la
 * revision de esta rebanada: "Lineas por archivo de codigo <= 200" — este
 * archivo llego a 288 antes del split).
 */
