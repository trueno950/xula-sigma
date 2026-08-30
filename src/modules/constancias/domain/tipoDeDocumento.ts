/**
 * Union cerrada de tipos de documento. Arranca con uno solo -la constancia
 * de vecindad- porque es el unico tramite que cubre esta fase (proposal.md).
 * `PREFIJOS` es un `Record` total sobre la union: agregar un tipo nuevo sin
 * su fila obliga a TypeScript a marcar el error, y el test de dominio lo
 * confirma en tiempo de ejecucion recorriendo `TIPOS_DE_DOCUMENTO` entero.
 */
export const TIPOS_DE_DOCUMENTO = ["VECINDAD"] as const;

export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

export const PREFIJOS: Record<TipoDeDocumento, string> = {
  VECINDAD: "VEC",
};

/**
 * La version de plantilla vigente por tipo de documento (design.md de
 * `constancias-oficios`, seccion 11, decision 12). `emitirConstancia` graba
 * `plantillaVersion: VERSION_ACTUAL[tipo]` y
 * `infrastructure/plantillas/registro.ts` construye `PLANTILLAS` con esta
 * misma clave: subirla de version es cambiar una linea aca, nunca en los
 * dos lugares.
 *
 * `as const satisfies` y no `Record<TipoDeDocumento, string>` como
 * `PREFIJOS`: el valor tiene que quedar literal (`"vecindad-v1"`, no
 * `string`) para que `PLANTILLAS[version]` en `registro.ts` narrowe sin
 * `noUncheckedIndexedAccess` agregando `| undefined` a una clave que sí
 * existe.
 */
export const VERSION_ACTUAL = {
  VECINDAD: "vecindad-v1",
} as const satisfies Record<TipoDeDocumento, string>;
