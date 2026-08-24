/**
 * `infrastructure` no se exporta aca; el porque esta en
 * `superficiePublica.test.ts` (design.md decision 3, "El objeto de tabla
 * no sale del modulo"). `domain` tampoco: a diferencia de `padron`, ningun
 * otro modulo necesita todavia `LugarId`/`CalleId`/`DomicilioId`/
 * `ResidenciaId` cruzando el limite.
 */
export * from "./application";
export * from "./composicion";
export type * from "./types";
export * from "./ui";
