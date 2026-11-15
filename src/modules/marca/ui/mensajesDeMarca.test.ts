import { describe, expect, it } from "vitest";
import { leerParametrosDeMarca } from "./mensajesDeMarca";

/**
 * La lectura de `?error=` y `?ok=` de `/marca`. El `?ok=` es de un
 * vocabulario cerrado: una clave inventada en la URL no pinta nada. El
 * `?error=` se pinta tal cual porque solo la accion lo escribe, y siempre
 * con una de las oraciones de este modulo.
 */

describe("leerParametrosDeMarca", () => {
  it("la clave de confirmacion conocida viaja al aviso", () => {
    expect(leerParametrosDeMarca({ ok: "colores-guardados" })).toEqual({
      error: undefined,
      ok: "colores-guardados",
    });
  });

  it("una clave inventada no pinta ningun aviso", () => {
    expect(
      leerParametrosDeMarca({ ok: "colores-borrados" }).ok,
    ).toBeUndefined();
  });

  it("el error llega tal cual lo escribio la accion", () => {
    expect(
      leerParametrosDeMarca({ error: "No se pudieron guardar los colores." }),
    ).toEqual({
      error: "No se pudieron guardar los colores.",
      ok: undefined,
    });
  });

  it("un error y una confirmacion juntos: gana el error", () => {
    expect(
      leerParametrosDeMarca({ error: "algo fallo", ok: "colores-guardados" }),
    ).toEqual({ error: "algo fallo", ok: undefined });
  });

  it("sin parametros no hay nada que pintar", () => {
    expect(leerParametrosDeMarca({})).toEqual({
      error: undefined,
      ok: undefined,
    });
  });
});
