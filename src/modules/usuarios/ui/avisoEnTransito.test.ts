import { describe, expect, it } from "vitest";
import { avisoATrasladar, RUTA_COOKIE_AVISO } from "./avisoEnTransito";
import { codificarAvisoPendiente } from "./avisoPendiente";

/**
 * S14 de `usuarios-ux`: el aviso que nombra a quien se dio de baja se
 * consume una sola vez. La cookie la borra el proxy en la unica peticion que
 * trae su token —`avisoEnTransito` decide cual es esa peticion, y por eso es
 * pura y no toca `next/headers`—.
 *
 * Sin token en la URL no se consume nada: recargar `/usuarios`, o volver con
 * el boton de atras a otra visita, no anuncia una accion que no ocurrio.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const COOKIE = codificarAvisoPendiente({
  token: TOKEN,
  usuarioId: "22222222-2222-4222-8222-222222222222",
});

const trasladar = (
  sobre: Partial<Parameters<typeof avisoATrasladar>[0]> = {},
) =>
  avisoATrasladar({
    metodo: "GET",
    ruta: RUTA_COOKIE_AVISO,
    token: TOKEN,
    cookie: COOKIE,
    ...sobre,
  });

describe("avisoATrasladar", () => {
  it("traslada la cookie cuando el token de la URL es el suyo", () => {
    expect(trasladar()).toBe(COOKIE);
  });

  it("con otro token en la URL no traslada nada", () => {
    expect(trasladar({ token: "33333333-3333-4333-8333-333333333333" })).toBe(
      null,
    );
  });

  it("sin token en la URL la cookie no se toca", () => {
    expect(trasladar({ token: undefined })).toBeNull();
  });

  it("sin cookie no hay nada que trasladar aunque el token este", () => {
    expect(trasladar({ cookie: undefined })).toBeNull();
  });

  it("una cookie que no tiene la forma del aviso se ignora", () => {
    expect(trasladar({ cookie: "{}" })).toBeNull();
  });

  it("solo el GET que pinta el listado la consume", () => {
    expect(trasladar({ metodo: "POST" })).toBeNull();
    expect(trasladar({ ruta: "/usuarios/alta" })).toBeNull();
  });
});
