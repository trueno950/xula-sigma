import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que `padron` necesita para expandir abreviaturas antes de normalizar
 * un nombre. El dominio no lo pide como tabla sino como mapa ya resuelto:
 * `normalizarParaBusqueda` recibe un `ReadonlyMap` y no sabe que existe
 * Postgres.
 *
 * Recibe la transaccion por parametro y no la abre: la lectura del
 * catalogo tiene que correr dentro de la misma `tx` que el INSERT de la
 * persona, porque la columna normalizada se calcula con lo que este
 * catalogo devuelva y las dos cosas confirman juntas o fallan juntas.
 */
export type CatalogoDeAbreviaturas = {
  leer(tx: TransaccionTenant): Promise<ReadonlyMap<string, string>>;
};

/**
 * Lo que un caso de uso puede suministrar del lado de la escritura. **No
 * lleva `nombreNormalizado`** (decision 6 de proposal.md, design.md
 * seccion 5): ni `altaDePersona` ni `editarPersona` la conocen, la calcula
 * el adaptador con la funcion de dominio en el mismo paso que persiste. Es
 * la costura por tipo, no por convencion.
 */
export type PersonaParaGuardar = {
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  curp: string | null;
};

/**
 * Lo que devuelve una lectura: los mismos campos de `PersonaParaGuardar`
 * mas lo que solo existe una vez guardada. Sin `fusionadaEn` todavia — esa
 * columna entra en la rebanada 4, y hasta entonces ninguna lectura resuelve
 * redireccion.
 */
export type PersonaGuardada = PersonaParaGuardar & {
  id: string;
  bajaEn: Date | null;
};

/**
 * `guardar`/`actualizar` agrupan aca lo que no es `tx` (metrica de
 * AGENTS.md, parametros por funcion ≤ 3): la identidad de la fila, el
 * dato a persistir y `expansiones`, que viaja junto porque el caso de uso
 * ya leyo el catalogo (memoizado) antes de llamar aca — pasarlo como
 * campo evita una segunda dependencia oculta hacia `CatalogoDeAbreviaturas`
 * desde `infrastructure`. `DatosDeAlta` lleva `ayuntamientoId` porque la
 * fila no existe todavia y RLS lo exige en el INSERT; `DatosDeEdicion` no,
 * porque el UPDATE ya esta acotado por la fila existente.
 */
export type DatosDeAlta = {
  id: string;
  ayuntamientoId: AyuntamientoId;
  persona: PersonaParaGuardar;
  expansiones: ReadonlyMap<string, string>;
};

export type DatosDeEdicion = {
  id: string;
  persona: PersonaParaGuardar;
  expansiones: ReadonlyMap<string, string>;
};

/**
 * Lo que el caso de uso necesita para persistir una persona, sin componer
 * SQL a mano (antipatron 7 de `AGENTS.md`). `guardar` y `actualizar`
 * reciben la transaccion de `withTenant` por parametro: el INSERT/UPDATE y
 * el INSERT de bitacora tienen que confirmar juntos o fallar juntos.
 */
export type RepositorioDePersonas = {
  guardar(tx: TransaccionTenant, datos: DatosDeAlta): Promise<void>;
  actualizar(tx: TransaccionTenant, datos: DatosDeEdicion): Promise<void>;
  /**
   * SELECT plano por `id`, sin resolucion de fusion todavia (esa columna y
   * ese salto entran en la rebanada 4). `null` cuando la fila no existe o
   * RLS la esconde por tenant — las dos cosas se ven igual del lado de
   * quien pregunta, que es exactamente la garantia que pide el escenario
   * "404 y no 403" del spec.
   */
  buscarPorId(
    tx: TransaccionTenant,
    id: string,
  ): Promise<PersonaGuardada | null>;
  /**
   * Baja logica: fija `bajaEn` sin tocar el resto de la fila. Metodo propio
   * y no `actualizar`, porque `actualizar` recibe `PersonaParaGuardar` y
   * recalcula `nombreNormalizado` — una baja no cambia el nombre, y
   * forzarla por ese camino recalcularia una columna que no debia moverse.
   */
  marcarBaja(tx: TransaccionTenant, id: string, bajaEn: Date): Promise<void>;
  /**
   * Listado para la pantalla de padron de esta rebanada. Excluye `bajaEn`
   * no nulo por defecto (mismo criterio que exige el spec para la busqueda
   * de la rebanada 3): una persona dada de baja no vuelve a aparecer sola,
   * sin que alguien la pida explicitamente.
   */
  listar(tx: TransaccionTenant): Promise<readonly PersonaGuardada[]>;
  /**
   * `cadenaExpandida` ya paso por `normalizarParaBusqueda` con el catalogo
   * leido — el caso de uso expande UNA vez, este metodo no vuelve a llamar
   * a la funcion de expansion por fila (spec, escenario "la expansion no
   * corre por fila"). Excluye `bajaEn` no nulo por defecto, mismo criterio
   * que `listar`.
   */
  buscar(
    tx: TransaccionTenant,
    cadenaExpandida: string,
    umbral: number,
  ): Promise<readonly PersonaGuardada[]>;
};
