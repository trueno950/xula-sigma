/**
 * `domain` e `infrastructure` no se exportan aca; el porque esta en
 * `superficiePublica.test.ts`.
 *
 * `composicion` si sale por aca (a diferencia de `marca`, que nunca
 * necesito una lectura invocada directo desde una pagina): design.md
 * seccion 7 ya anticipa que un valor de `composicion.ts` sale "por el
 * barrel como valor", y `listarPersonas` es el primer caso real. No es un
 * ciclo — `composicion.ts` no importa `./ui` ni `./index`, solo al reves.
 */
export * from "./application";
export * from "./composicion";
export type * from "./types";
export * from "./ui";
