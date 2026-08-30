import { describe, expect, it } from "vitest";
import {
  PREFIJOS,
  TIPOS_DE_DOCUMENTO,
  VERSION_ACTUAL,
} from "./tipoDeDocumento";

/**
 * Forma de tabla de `roles.test.ts`: se recorre `TIPOS_DE_DOCUMENTO`
 * entero para que un tipo nuevo **falte** en `PREFIJOS` en vez de heredar
 * un prefijo por descarte.
 */
describe("PREFIJOS", () => {
  it.each(TIPOS_DE_DOCUMENTO)("tiene un prefijo definido para %s", (tipo) => {
    expect(typeof PREFIJOS[tipo]).toBe("string");
    expect(PREFIJOS[tipo].length).toBeGreaterThan(0);
  });

  it("VECINDAD usa el prefijo VEC", () => {
    expect(PREFIJOS.VECINDAD).toBe("VEC");
  });
});

/**
 * Mismo criterio que `PREFIJOS`, para la version de plantilla que
 * `emitirConstancia` graba en `plantillaVersion` (design.md de
 * `constancias-oficios`, seccion 10: `plantillaVersion: VERSION_ACTUAL[tipo]`).
 * Vive en el dominio -no en `infrastructure/plantillas/registro.ts`- porque
 * `emitirConstancia` (application) la necesita sin poder importar
 * infrastructure; `registro.ts` importa esta misma constante para construir
 * `PLANTILLAS`, asi que el literal `"vecindad-v1"` tiene un solo origen.
 */
describe("VERSION_ACTUAL", () => {
  it.each(TIPOS_DE_DOCUMENTO)("tiene una version definida para %s", (tipo) => {
    expect(typeof VERSION_ACTUAL[tipo]).toBe("string");
    expect(VERSION_ACTUAL[tipo].length).toBeGreaterThan(0);
  });

  it("VECINDAD usa vecindad-v1", () => {
    expect(VERSION_ACTUAL.VECINDAD).toBe("vecindad-v1");
  });
});
