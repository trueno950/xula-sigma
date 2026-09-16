/**
 * `infrastructure` no se exporta aca; el porque esta en
 * `superficiePublica.test.ts` (design.md decision 3, "El objeto de tabla
 * no sale del modulo"). De `domain` sale solo el reexport nombrado de
 * abajo -nunca `export * from "./domain"`, mismo patron que
 * `padron/index.ts`-: `src/app/(panel)/territorio/page.tsx` necesita
 * `comoLugarId` para validar `?raiz=` antes de llamar a `lugarPorId`.
 * `comoCalleId`/`CalleId` se agregan en la Fase 1 de `reportes-ciudadanos`
 * (tasks.md 1.8): `reportes` necesita construir un `CalleId` valido antes
 * de llamar a `ubicacionDeLugar`, que lo pide tipado en su entrada.
 */
export * from "./application";
export * from "./composicion";
export {
  type CalleId,
  comoCalleId,
  comoLugarId,
  type LugarId,
  puedeTenerCatalogoDeCalles,
} from "./domain";
export type * from "./types";
export * from "./ui";
