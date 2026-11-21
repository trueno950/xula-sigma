import { describe, expect, it } from "vitest";
import { urlSinElAviso } from "./urlSinElAviso";

/**
 * S14 de `usuarios-ux` con JavaScript: la URL del listado sin el token del
 * aviso de la baja (ni la confirmacion que lo acompaña).
 *
 * Por que hace falta, en una sola frase: el `Set-Cookie` con el que el proxy
 * borra la cookie viaja en el render sintetico del `redirect` de la Server
 * Action, y el navegador no lo guarda, asi que una recarga inmediata vuelve a
 * pedir la misma URL con la cookie viva. La explicacion completa esta en
 * `AGENTS.md`, nota de `usuarios`, junto a la de la contrasenia temporal, que
 * se cerro igual.
 */

const conAviso = (consulta: string) =>
  new URL(`https://motul.xula.localhost:3000/usuarios${consulta}`);

const TOKEN = "11111111-1111-4111-8111-111111111111";

describe("urlSinElAviso", () => {
  it("quita el token del aviso y la confirmacion que lo acompaña", () => {
    expect(urlSinElAviso(conAviso(`?aviso=${TOKEN}&ok=baja`), TOKEN)).toBe(
      "/usuarios",
    );
  });

  it("no toca los parametros que no son del aviso", () => {
    expect(
      urlSinElAviso(
        conAviso(`?aviso=${TOKEN}&ok=baja&error=sin-permiso`),
        TOKEN,
      ),
    ).toBe("/usuarios?error=sin-permiso");
  });

  /** Un aviso ajeno en la URL no es el que se esta pintando. */
  it("con otro token en la URL no limpia nada", () => {
    expect(
      urlSinElAviso(
        conAviso("?aviso=33333333-3333-4333-8333-333333333333&ok=baja"),
        TOKEN,
      ),
    ).toBeNull();
  });

  it("sin aviso en la URL no hay nada que limpiar", () => {
    expect(urlSinElAviso(conAviso("?ok=baja"), TOKEN)).toBeNull();
  });

  it("devuelve una ruta del mismo host, no una URL absoluta", () => {
    const limpia = urlSinElAviso(conAviso(`?aviso=${TOKEN}&ok=baja`), TOKEN);

    expect(limpia?.startsWith("/")).toBe(true);
  });
});
