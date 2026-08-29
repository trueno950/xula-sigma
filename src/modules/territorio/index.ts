/**
 * `infrastructure` no se exporta aca; el porque esta en
 * `superficiePublica.test.ts` (design.md decision 3, "El objeto de tabla
 * no sale del modulo"). De `domain` sale solo el reexport nombrado de
 * abajo -nunca `export * from "./domain"`, mismo patron que
 * `padron/index.ts`-: `src/app/(panel)/territorio/page.tsx` necesita
 * `comoLugarId` para validar `?raiz=` antes de llamar a `lugarPorId`, y
 * ningun otro simbolo del dominio cruza el limite todavia.
 */
export * from "./application";
export * from "./composicion";
export { comoLugarId, type LugarId } from "./domain";
export type * from "./types";
export * from "./ui";
