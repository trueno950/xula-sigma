import { describe, expect, it } from "vitest";
import { leerParametros } from "./parametros";

const RAIZ_AJENA = "11111111-1111-4111-8111-111111111111";

/**
 * S3 de `territorio-ux`: «Editar» dejo de ser pestana y sus tres acciones
 * viven en la cabecera. `?vista=editar` y `?accion=renombrar|reparentear|
 * baja` siguen abriendo, con el pliegue que corresponde abierto: son
 * enlaces que ya estan en el historial y en los correos del municipio.
 */
describe("las URLs viejas de la pestana Editar", () => {
  it("una vista `editar` vieja abre la pestana base del lugar, sin 404", () => {
    expect(leerParametros({ vista: "editar" }).vista).toBe("lugares");
  });

  it.each(["renombrar", "reparentear", "baja"] as const)(
    "la accion %s conserva el pliegue y abre la pestana base",
    (accion) => {
      const parametros = leerParametros({
        raiz: RAIZ_AJENA,
        vista: "editar",
        accion,
      });

      expect(parametros.accion).toBe(accion);
      expect(parametros.vista).toBe("lugares");
    },
  );
});
