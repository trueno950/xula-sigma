/**
 * `infrastructure` no se exporta aca; el porque esta en
 * `superficiePublica.test.ts`. De `domain` sale solo el reexport nombrado
 * de abajo -nunca `export * from "./domain"`-: `Persona`,
 * `normalizarParaBusqueda` y `normalizarCurp` siguen inalcanzables, y
 * `superficiePublica.test.ts` trae una assertion dedicada a que
 * `normalizarParaBusqueda` no se cuele (capa-territorial design.md
 * decision 2).
 *
 * `composicion` si sale por aca (a diferencia de `marca`, que nunca
 * necesito una lectura invocada directo desde una pagina): design.md
 * seccion 7 ya anticipa que un valor de `composicion.ts` sale "por el
 * barrel como valor", y `listarPersonas` es el primer caso real. No es un
 * ciclo — `composicion.ts` no importa `./ui` ni `./index`, solo al reves.
 */
export * from "./application";
export * from "./composicion";
export { comoPersonaId, esPersonaId, type PersonaId } from "./domain";
export type * from "./types";
export * from "./ui";
