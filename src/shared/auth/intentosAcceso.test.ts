import { describe, expect, it } from "vitest";
import { TIPOS_INTENTO } from "./intentosAcceso";

/**
 * `TIPOS_INTENTO` es la union cerrada que sostiene el CHECK de Postgres
 * (`intentos_acceso_tipo_valido`) y el `Record` de `LIMITES` en `ritmo.ts`.
 * Un tercer valor que falte aca abre una ventana que nadie cuenta: el
 * limitador dejaria de limitar sin que nada falle (design.md de
 * `constancias-oficios`, seccion 12).
 */
describe("TIPOS_INTENTO", () => {
  it("incluye folio ademas de correo e ip", () => {
    expect(TIPOS_INTENTO).toEqual(["correo", "ip", "folio"]);
  });
});
