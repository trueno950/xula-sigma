import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { OrdenDePersonas, PersonaId } from "../domain";

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
 * mas lo que solo existe una vez guardada. Sin `fusionadaEn`: el puerto de
 * lectura ya resuelve la redireccion (design.md decision 3), asi que quien
 * llama a `buscarPorId`/`listar`/`buscar` nunca necesita saber si el `id`
 * que pidio era el ganador o un perdedor redirigido.
 */
export type PersonaGuardada = PersonaParaGuardar & {
  id: PersonaId;
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
  id: PersonaId;
  ayuntamientoId: AyuntamientoId;
  persona: PersonaParaGuardar;
  expansiones: ReadonlyMap<string, string>;
};

export type DatosDeEdicion = {
  id: PersonaId;
  persona: PersonaParaGuardar;
  expansiones: ReadonlyMap<string, string>;
};

/**
 * Lo que `listar`/`buscar` reciben del caso de uso para paginar y ordenar
 * (`design.md`, "Paginacion" y "Ordenamiento de columnas"). `limite` ya
 * llega con el `+1` de `resolverPagina` sumado -el repositorio no sabe del
 * truco, solo ejecuta el `LIMIT`/`ORDER BY` que se le pide. `orden` ausente
 * conserva el orden por defecto de cada metodo: alfabetico en `listar`,
 * relevancia (`similarity`) en `buscar`.
 */
export type OpcionesDeListado = {
  readonly limite: number;
  readonly orden?: OrdenDePersonas;
};

/**
 * `OpcionesDeListado` mas `umbral`, para que `buscar` siga en 3 parametros
 * (metrica de AGENTS.md): `tx`, `cadenaExpandida`, `opciones`. `umbral` no
 * vive en `OpcionesDeListado` porque `listar` no tiene nocion de similitud.
 * `palabras` y `curp` se suman a la similitud; ausentes, es solo similitud.
 */
export type OpcionesDeBusqueda = OpcionesDeListado & {
  readonly umbral: number;
  readonly palabras?: readonly string[];
  readonly curp?: string;
};

/**
 * Lo que `listarPersonas`/`buscarPersonas` devuelven a la pantalla:
 * `personas` ya recortada a la pagina pedida, y `hayMas` -de
 * `resolverPagina`- para que `ListadoDePersonas` sepa si pintar el link
 * "Ver mas".
 */
export type ResultadoDeListado = {
  readonly personas: readonly PersonaGuardada[];
  readonly hayMas: boolean;
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
   * Resuelve la redireccion colapsada antes de leer (design.md decision
   * 3): si `id` es un perdedor, devuelve los datos actuales del ganador
   * terminal, no una foto del momento de la fusion. `null` cuando la fila
   * no existe o RLS la esconde por tenant — las dos cosas se ven igual del
   * lado de quien pregunta, que es exactamente la garantia que pide el
   * escenario "404 y no 403" del spec.
   */
  buscarPorId(
    tx: TransaccionTenant,
    id: PersonaId,
  ): Promise<PersonaGuardada | null>;
  /**
   * Baja logica: fija `bajaEn` sin tocar el resto de la fila. Metodo propio
   * y no `actualizar`, porque `actualizar` recibe `PersonaParaGuardar` y
   * recalcula `nombreNormalizado` — una baja no cambia el nombre, y
   * forzarla por ese camino recalcularia una columna que no debia moverse.
   */
  marcarBaja(tx: TransaccionTenant, id: PersonaId, bajaEn: Date): Promise<void>;
  /**
   * Listado para la pantalla de padron de esta rebanada. Excluye `bajaEn`
   * no nulo por defecto (mismo criterio que exige el spec para la busqueda
   * de la rebanada 3): una persona dada de baja no vuelve a aparecer sola,
   * sin que alguien la pida explicitamente. `opciones.limite` es el `LIMIT`
   * de Postgres tal cual -sin `OFFSET`: "Ver mas" crece el limite, no pagina
   * por indice (`design.md`, "Paginacion")-, y `opciones.orden` cambia el
   * `ORDER BY` a apellido/nombre en la direccion pedida; sin orden, sigue el
   * alfabetico de siempre.
   */
  listar(
    tx: TransaccionTenant,
    opciones: OpcionesDeListado,
  ): Promise<readonly PersonaGuardada[]>;
  /**
   * `cadenaExpandida` ya paso por `normalizarParaBusqueda` con el catalogo
   * leido — el caso de uso expande UNA vez, este metodo no vuelve a llamar
   * a la funcion de expansion por fila (spec, escenario "la expansion no
   * corre por fila"). Excluye `bajaEn` no nulo por defecto, mismo criterio
   * que `listar`. `opciones` es el mismo contrato que `listar`:
   * `opciones.orden` ausente conserva el orden por relevancia
   * (`similarity` descendente); presente, lo reemplaza por
   * apellido/nombre -el operador pidio alfabetico, y relevancia y
   * alfabetico no se combinan.
   */
  buscar(
    tx: TransaccionTenant,
    cadenaExpandida: string,
    opciones: OpcionesDeBusqueda,
  ): Promise<readonly PersonaGuardada[]>;
  /**
   * `perdedoraId`/`ganadoraId` ya son terminales (el caso de uso los
   * resolvio con `buscarPorId` antes de llamar aca) y distintos (la
   * auto-fusion no-opera antes de llegar). Dos UPDATE, design.md decision
   * 3: primero reengancha a quienes ya apuntaban a la perdedora, despues
   * marca a la perdedora misma.
   */
  fusionar(
    tx: TransaccionTenant,
    perdedoraId: PersonaId,
    ganadoraId: PersonaId,
  ): Promise<void>;
  /**
   * Deshace una fusion directa (design.md decision 3, "Reversion"):
   * `id` vuelve a ser terminal, y quienes se habian reenganchado a traves
   * suyo (`fusionadaDirectoEn = id`) se des-colapsan de vuelta a `id` en
   * vez de quedar apuntando al que fuera terminal antes de revertir.
   *
   * Devuelve si `id` existia, pertenecia a este tenant y **estaba
   * fusionada** -RLS deja un `UPDATE` sobre una fila ajena o inexistente en
   * cero filas sin error, y una fila propia que nunca se fusiono tampoco
   * cuenta como reversion real-, asi el caso de uso puede distinguir
   * "revirtio" de "no-op silencioso" y responder 404 en vez de registrar en
   * bitacora una reversion que nunca paso.
   */
  revertirFusion(tx: TransaccionTenant, id: PersonaId): Promise<boolean>;
  /**
   * La direccion inversa de `buscarPorId`: no "id cualquiera -> terminal"
   * sino "terminal -> todos los ids que colapsan en el". El invariante de
   * design.md decision 3 -toda fila con `fusionadaEn` no nulo apunta a una
   * terminal- garantiza que la clase de equivalencia completa esta a un
   * salto, sin cadena que recorrer. Sin fusion devuelve `[id]`.
   */
  identidadesDe(
    tx: TransaccionTenant,
    id: PersonaId,
  ): Promise<readonly PersonaId[]>;
};
