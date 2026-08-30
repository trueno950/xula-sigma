import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que los casos de uso de `constancias` necesitan para leer y escribir
 * `configuracion_de_documentos` sin componer SQL a mano (antipatron 7 de
 * `AGENTS.md`). Las dos operaciones reciben la transaccion de `withTenant`
 * por parametro y no la abren ellas mismas: mismo criterio que
 * `RepositorioDeMarca` (`modules/marca/application/puertos.ts`).
 *
 * Repositorio propio, no el de `marca`: compartirlo obligaria a
 * `constancias` a importar `marca`, una arista entre modulos donde alcanza
 * un `tx.update(configuracionDeDocumentos)` (design.md de
 * `constancias-oficios`, decision 8).
 */
export type RepositorioDeDocumentos = {
  /**
   * El valor crudo de `datos` para ese ayuntamiento, o `null` si la fila
   * no existe -un ayuntamiento sin fila es "sin configurar"-. No valida ni
   * normaliza: `datos` sigue siendo `unknown` de este lado, y quien
   * pregunta decide que hacer con un valor que no es un objeto plano.
   */
  leer(tx: TransaccionTenant, ayuntamientoId: AyuntamientoId): Promise<unknown>;
  /**
   * Reemplaza `datos` entero para ese ayuntamiento, dentro de `tx`, con un
   * upsert sobre la PK (design.md de `constancias-oficios`, decision 8).
   */
  escribir(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
    datos: Record<string, unknown>,
  ): Promise<void>;
};

/** Lo que `emitirConstancia` necesita saber de `padron` sobre el titular. */
export type TitularLeido = {
  nombreCompleto: string;
  bajaEn: Date | null;
};

/**
 * Sin `tx`: se llama **antes** de abrir el `withTenant` de `emitirConstancia`
 * (design.md de `constancias-oficios`, seccion 10). El adaptador real
 * (`infrastructure/lectorDeTitularesPorPadron.ts`) abre su propio
 * `withTenant` -el de `padron`- por dentro, mismo criterio que
 * `LecturaDePersonas` de `territorio`.
 */
export type LecturaDeTitulares = {
  porId(personaId: string): Promise<TitularLeido | null>;
};

/** Lo que `emitirConstancia` necesita saber de `territorio` sobre la direccion vigente. */
export type DireccionLeida = {
  texto: string;
  residenciaId: string;
  desdeEn: string;
};

/** Mismo criterio que `LecturaDeTitulares`: sin `tx`, fuera del `withTenant` propio. */
export type LecturaDeDirecciones = {
  vigenteDe(personaId: string): Promise<DireccionLeida | null>;
};

/**
 * Lo que `pdfDeConstancia` necesita de `ayuntamientos` para armar
 * `EntradaDeRender.municipio` (design.md de `constancias-oficios`, seccion 4:
 * "`municipio.nombre` no se guarda, se lee de `ayuntamientos` al
 * renderizar"). `escudo` ya sale validado -nunca el `unknown` crudo de la
 * columna `marca`- porque el adaptador real reusa `leerMarca` de
 * `shared/marca`, el mismo precedente que `modules/marca` usa para no
 * confiar en JSON escrito a mano.
 */
export type AyuntamientoLeido = {
  nombre: string;
  subdominio: string;
  escudo?: string;
};

/**
 * Con `tx`, a diferencia de `LecturaDeTitulares` y `LecturaDeDirecciones`:
 * `ayuntamientos` es una tabla de `shared/tenancy`, no de otro modulo, asi
 * que leerla no anida un `withTenant` ajeno -mismo criterio que
 * `RepositorioDeDocumentos.leer(tx, ayuntamientoId)`-.
 */
export type LecturaDeAyuntamiento = {
  porId(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
  ): Promise<AyuntamientoLeido | null>;
};
