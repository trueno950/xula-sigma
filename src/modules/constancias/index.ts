/**
 * `infrastructure` no se exporta aca; el porque esta en
 * `superficiePublica.test.ts` (mismo patron que `territorio/index.ts`). De
 * `domain` sale solo el reexport nombrado de abajo -nunca
 * `export * from "./domain"`, mismo patron que `padron/index.ts` y
 * `territorio/index.ts`-: `src/app/(panel)/constancias/[id]/page.tsx`
 * necesita `comoConstanciaId` para validar el id de la ruta antes de llamar
 * a `constanciaPorId` (rebanada 4b).
 */
export * from "./application";
export * from "./composicion";
export { type ConstanciaId, comoConstanciaId } from "./domain";
export type * from "./types";
export * from "./ui";
