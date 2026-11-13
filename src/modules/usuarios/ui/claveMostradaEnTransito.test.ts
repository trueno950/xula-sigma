import { describe, expect, it } from "vitest";
import { claveATrasladar } from "./claveMostradaEnTransito";

/**
 * El traslado de la cookie a la cabecera es lo que hace que la contrasenia
 * temporal se muestre una sola vez tambien sin JavaScript (S2): el proxy la
 * mueve y la borra en la misma respuesta, y la pantalla ya no puede leer la
 * cookie. Lo que se prueba aca es la condicion, no el proxy.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const COOKIE = JSON.stringify({
  token: TOKEN,
  motivo: "alta",
  usuarioId: "22222222-2222-4222-8222-222222222222",
  clave: "clave-temporal-larga",
});

const OTRO_TOKEN = "33333333-3333-4333-8333-333333333333";

describe("claveATrasladar", () => {
  it("traslada la cookie cuando la ruta es /usuarios y la URL trae su token", () => {
    expect(
      claveATrasladar({ ruta: "/usuarios", token: TOKEN, cookie: COOKIE }),
    ).toBe(COOKIE);
  });

  it("un token que no es el de la cookie no la consume: volver a una URL vieja no quema la clave nueva", () => {
    expect(
      claveATrasladar({ ruta: "/usuarios", token: OTRO_TOKEN, cookie: COOKIE }),
    ).toBeNull();
  });

  it("una cookie que no es una clave mostrada valida no se traslada", () => {
    expect(
      claveATrasladar({ ruta: "/usuarios", token: TOKEN, cookie: "basura" }),
    ).toBeNull();
  });

  it("solo un GET la consume: un POST a la misma URL la deja donde esta", () => {
    expect(
      claveATrasladar({
        metodo: "POST",
        ruta: "/usuarios",
        token: TOKEN,
        cookie: COOKIE,
      }),
    ).toBeNull();
  });

  it("en otra ruta no la traslada ni la toca", () => {
    expect(
      claveATrasladar({ ruta: "/padron", token: TOKEN, cookie: COOKIE }),
    ).toBeNull();
    expect(
      claveATrasladar({ ruta: "/usuarios/alta", token: TOKEN, cookie: COOKIE }),
    ).toBeNull();
  });

  it("sin el token en la URL no la traslada: la cookie se queda donde esta", () => {
    expect(
      claveATrasladar({ ruta: "/usuarios", token: undefined, cookie: COOKIE }),
    ).toBeNull();
    expect(
      claveATrasladar({ ruta: "/usuarios", token: "", cookie: COOKIE }),
    ).toBeNull();
  });

  it("sin cookie no hay nada que trasladar", () => {
    expect(
      claveATrasladar({ ruta: "/usuarios", token: TOKEN, cookie: undefined }),
    ).toBeNull();
    expect(
      claveATrasladar({ ruta: "/usuarios", token: TOKEN, cookie: "" }),
    ).toBeNull();
  });
});
