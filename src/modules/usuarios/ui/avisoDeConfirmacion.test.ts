import { describe, expect, it } from "vitest";
import { avisoDeConfirmacion } from "./avisoDeConfirmacion";

/**
 * S11 de `usuarios-ux` (hallazgo R1): el exito de un alta o un
 * restablecimiento solo se anuncia junto a la contrasenia nueva. Si la clave
 * ya no se puede ver, el aviso lo dice y manda a restablecer.
 *
 * La baja ya no pasa por aca (S13 y S14): su aviso dice de quien y de cuando,
 * va en una cookie de un solo uso y no en la URL, y lo pinta
 * `AvisoDeAccion.tsx`. Un `?ok=baja` escrito a mano no anuncia nada.
 */

describe("avisoDeConfirmacion", () => {
  it("sin confirmacion en la URL no hay aviso, haya o no tarjeta", () => {
    expect(
      avisoDeConfirmacion({ ok: undefined, hayClaveVisible: true }),
    ).toBeNull();
    expect(
      avisoDeConfirmacion({ ok: undefined, hayClaveVisible: false }),
    ).toBeNull();
  });

  it("con la clave a la vista, el restablecimiento confirma", () => {
    expect(
      avisoDeConfirmacion({ ok: "restablecimiento", hayClaveVisible: true }),
    ).toEqual({ tono: "exito", texto: "La contraseña quedó restablecida." });
  });

  it("sin la clave a la vista, el alta avisa que hay que restablecer", () => {
    expect(avisoDeConfirmacion({ ok: "alta", hayClaveVisible: false })).toEqual(
      {
        tono: "aviso",
        texto:
          "La cuenta quedó creada, pero la contraseña nueva ya no se puede mostrar. Restablézcala para generar otra.",
      },
    );
  });

  it("sin la clave a la vista, el restablecimiento avisa que hay que restablecer", () => {
    expect(
      avisoDeConfirmacion({
        ok: "restablecimiento",
        hayClaveVisible: false,
      }),
    ).toEqual({
      tono: "aviso",
      texto:
        "La contraseña quedó restablecida, pero ya no se puede mostrar. Restablézcala para generar otra.",
    });
  });

  it("la baja no se anuncia por la URL: la anuncia el aviso de un solo uso", () => {
    expect(
      avisoDeConfirmacion({ ok: "baja", hayClaveVisible: true }),
    ).toBeNull();
    expect(
      avisoDeConfirmacion({ ok: "baja", hayClaveVisible: false }),
    ).toBeNull();
  });
});
