import { describe, expect, it } from "vitest";
import { urlSinLaClaveMostrada } from "./urlSinLaClaveMostrada";

/**
 * S9 de `usuarios-ux`: al pintarse la tarjeta, la URL se queda sin el token
 * de la clave mostrada y sin la confirmacion que lo acompañaba. Lo que se
 * prueba aca es la regla sobre la URL —que se borra, que se borra solo eso y
 * que no toca el resto—; que corra al pintar lo prueba
 * `e2e/usuariosClaveTemporal.spec.ts`.
 */

const url = (valor: string) => new URL(valor);

describe("urlSinLaClaveMostrada", () => {
  it("borra el token de la clave y la confirmacion que lo acompañaba", () => {
    expect(
      urlSinLaClaveMostrada(
        url("http://motul.example.com/usuarios?clave=1111&ok=restablecimiento"),
      ),
    ).toBe("/usuarios");
  });

  it("no toca los demas parametros", () => {
    expect(
      urlSinLaClaveMostrada(
        url("http://motul.example.com/usuarios?clave=1111&ok=alta&error=baja"),
      ),
    ).toBe("/usuarios?error=baja");
  });

  it("una URL que no trae el token no se reescribe", () => {
    expect(
      urlSinLaClaveMostrada(url("http://motul.example.com/usuarios?ok=baja")),
    ).toBeNull();
  });

  it("devuelve una ruta del mismo host, no una URL absoluta", () => {
    expect(
      urlSinLaClaveMostrada(
        url("http://motul.example.com:3200/usuarios?clave=1111&ok=alta"),
      ),
    ).toBe("/usuarios");
  });
});
