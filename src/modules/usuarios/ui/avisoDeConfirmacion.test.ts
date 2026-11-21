import { describe, expect, it } from "vitest";
import { avisoDeConfirmacion } from "./avisoDeConfirmacion";

/**
 * S11 de `usuarios-ux` (hallazgo R1): el exito de un alta o un
 * restablecimiento solo se anuncia junto a la contrasenia nueva. Si la clave
 * ya no se puede ver, el aviso lo dice y manda a restablecer; la baja, que no
 * emite clave, confirma siempre.
 *
 * Regresion del verificador: el mapeo completo, incluido el caso sin `ok` y
 * la baja en sus dos estados.
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

  it("la baja confirma siempre: no emite clave que mostrar", () => {
    const confirmada = {
      tono: "exito",
      texto: "La persona quedó dada de baja y ya no puede entrar.",
    };

    expect(avisoDeConfirmacion({ ok: "baja", hayClaveVisible: true })).toEqual(
      confirmada,
    );
    expect(avisoDeConfirmacion({ ok: "baja", hayClaveVisible: false })).toEqual(
      confirmada,
    );
  });
});
