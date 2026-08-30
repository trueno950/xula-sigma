/**
 * `infrastructure` no se exporta aca; el porque esta en
 * `superficiePublica.test.ts` (mismo patron que `territorio/index.ts`). De
 * `domain` no sale nada todavia: ningun consumidor externo necesita un
 * identificador de `constancias` hasta que exista un primer caso de uso.
 */
export * from "./application";
export * from "./composicion";
export type * from "./types";
export * from "./ui";
