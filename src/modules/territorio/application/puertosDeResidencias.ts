import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, DomicilioId, LugarId, ResidenciaId } from "../domain";

/**
 * Puertos de la rebanada de residencias, separados de `puertos.ts`
 * (hallazgo de GGA en la revision de esta rebanada: "Lineas por archivo de
 * codigo <= 200" — `puertos.ts` llego a 288). Mismo criterio de recorte
 * que cualquier otro split por area: lugares/calles/domicilios quedan en
 * `puertos.ts`, residencias aca.
 *
 * `personaId` es `string`, no el `PersonaId` de `padron` (otro hallazgo de
 * GGA en esta misma revision): ese tipo vive en `padron/domain` y traerlo
 * aca -aunque sea `import type`- es el antipatron 8 de `AGENTS.md`, el
 * mismo que ya documenta `esquema.ts` (design.md decision 4). `territorio`
 * no valida ni interpreta este uuid; la unica frontera que puede
 * convertirlo es el adaptador `lectorDePersonasPorPadron.ts`, porque es el
 * que de verdad llama a las funciones tipadas de `padron`.
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
