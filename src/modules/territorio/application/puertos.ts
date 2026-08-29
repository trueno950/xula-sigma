import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  CalleId,
  DomicilioId,
  LugarId,
  ResidenciaId,
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
  bajaEn: Date | null;
};

export type DatosDeActualizacionDeCalle = {
  id: CalleId;
  nombre: string;
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
  /** Calles activas (`bajaEn IS NULL`) de un lugar, para el catalogo y `SelectorDeCalle`. */
  listarPorLugar(
    tx: TransaccionTenant,
    lugarId: LugarId,
  ): Promise<readonly CalleGuardada[]>;
};

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
};

/**
 * `personaId` es `string`, no el `PersonaId` de `padron` (hallazgo de GGA
 * en la revision de esta rebanada): ese tipo vive en `padron/domain` y
 * traerlo aca -aunque sea `import type`- es el antipatron 8 de
 * `AGENTS.md`, el mismo que ya document `esquema.ts` (design.md decision
 * 4). `territorio` no valida ni interpreta este uuid; la unica frontera
 * que puede convertirlo es el adaptador `lectorDePersonasPorPadron.ts`,
 * porque es el que de verdad llama a las funciones tipadas de `padron`.
 */
export type DatosDeAperturaDeResidencia = {
  ayuntamientoId: AyuntamientoId;
  personaId: string;
  domicilioId: DomicilioId;
  desdeEn: string;
};

export type ResidenciaGuardada = {
  id: ResidenciaId;
  personaId: string;
  domicilioId: DomicilioId;
  desdeEn: string;
  hastaEn: string | null;
  creadoEn: Date;
  /**
   * Resuelto con un `JOIN` a `domicilios` en la misma consulta de
   * `historialDe` (design.md seccion 8, "El camino de lectura del
   * colapso"): evita que el historial de una persona necesite una consulta
   * por fila para poder mostrar donde vivio.
   */
  domicilio: { calleId: CalleId; lugarId: LugarId; numero: string | null };
};

/**
 * `cerrarAbierta`/`abrir` son las dos mitades de `registrarMudanza`
 * (design.md seccion 8): una transaccion, dos escrituras, dos trazas.
 * `cerrarAbierta` devuelve `null` cuando la persona no tenia ninguna
 * residencia abierta -su primera mudanza registrada-, y ahi
 * `registrarMudanza` omite la traza `CERRAR_RESIDENCIA`.
 *
 * `historialDe` recibe la lista completa de ids que colapsan en una
 * identidad fusionada (`LecturaDePersonas.identidadesDe`) y hace un solo
 * `WHERE persona_id IN (…)`: la "residencia vigente" la elige quien llama
 * -primera fila con `hastaEn` null en el orden `desdeEn DESC, creadoEn
 * DESC`- porque no hay escritura que reconciliar (design.md seccion 8, "El
 * camino de lectura del colapso").
 *
 * `residentesDe` recibe ids de `domicilios` ya resueltos por el subarbol de
 * `RepositorioDeDomicilios.porLugarYSubarbol` -esa es la unica pieza
 * recursiva- y filtra `residencias` por `domicilioId IN (…) AND hastaEn IS
 * NULL` con el builder de Drizzle. Nunca `sql\`…\``: una plantilla que
 * mencione `persona_id` o `residencias` dispara `identidadPorPuerto.test.ts`
 * (design.md seccion 5), y esta consulta necesita las dos cosas.
 */
export type RepositorioDeResidencias = {
  cerrarAbierta(
    tx: TransaccionTenant,
    personaId: string,
    hastaEn: string,
  ): Promise<ResidenciaId | null>;
  abrir(
    tx: TransaccionTenant,
    datos: DatosDeAperturaDeResidencia,
  ): Promise<ResidenciaId>;
  historialDe(
    tx: TransaccionTenant,
    identidades: readonly string[],
  ): Promise<readonly ResidenciaGuardada[]>;
  residentesDe(
    tx: TransaccionTenant,
    domicilioIds: readonly DomicilioId[],
  ): Promise<readonly string[]>;
};

/**
 * Puerto propio de `territorio` sobre la lectura compuesta de `padron`
 * (design.md seccion 6). `id` es `string`, no el `PersonaId` de `padron`
 * -mismo motivo que `DatosDeAperturaDeResidencia.personaId` arriba-.
 * **Sin `tx` en la firma, a proposito**: el adaptador
 * (`infrastructure/lectorDePersonasPorPadron.ts`) llama a los casos de uso
 * de `padron`, que abren su propio `withTenant`. Si `territorio` lo
 * invocara desde adentro de su propia transaccion seria un `withTenant`
 * anidado — con `DB_POOL_MAX=1` en integracion se traba, y en produccion
 * consume dos conexiones del pool por operacion. Por eso
 * `registrarMudanza`/`historialDeResidencias` lo llaman **antes** de abrir
 * `withTenant`, nunca adentro.
 */
export type LecturaDePersonas = {
  terminalDe(id: string): Promise<string | null>;
  identidadesDe(id: string): Promise<readonly string[]>;
};
