import { VERSION_ACTUAL } from "../../domain";
import { ConstanciaDeVecindadV1 } from "./ConstanciaDeVecindadV1";
import type { ComponenteDePlantilla } from "./tipos";

export type { ComponenteDePlantilla, PropsDePlantilla } from "./tipos";

/**
 * El registro de plantillas (design.md de `constancias-oficios`, seccion 11,
 * decision 12). La clave sale de `VERSION_ACTUAL` -que vive en `domain`
 * porque `emitirConstancia` (application) tambien la necesita y no puede
 * importar `infrastructure`- para que el literal `"vecindad-v1"` tenga un
 * solo origen: lo que `emitirConstancia` graba y lo que este registro
 * reconoce son la misma constante, nunca dos copias que puedan divergir.
 *
 * `VERSION_ACTUAL.VECINDAD` es literal (`"vecindad-v1"`, no `string`) porque
 * el dominio la declara `as const satisfies`: eso es lo que deja a
 * `renderizadorReactPdf.ts` narrowear `plantillaVersion` a
 * `keyof typeof PLANTILLAS` y leer `PLANTILLAS[version]` sin que
 * `noUncheckedIndexedAccess` le agregue `| undefined` a una clave que el
 * `in` ya probo que existe.
 */
export const PLANTILLAS = {
  [VERSION_ACTUAL.VECINDAD]: ConstanciaDeVecindadV1,
} as const satisfies Record<string, ComponenteDePlantilla>;
