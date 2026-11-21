import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  cookies: new Map<
    string,
    { valor: string; opciones: Record<string, unknown> }
  >(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => {
      const guardada = estado.cookies.get(nombre);
      return guardada === undefined
        ? undefined
        : { name: nombre, value: guardada.valor };
    },
    set: (nombre: string, valor: string, opciones: Record<string, unknown>) =>
      void estado.cookies.set(nombre, { valor, opciones }),
    delete: (opciones: { name: string }) =>
      void estado.cookies.delete(opciones.name),
  }),
}));

const {
  destinatarioDeLaClaveDeLaPeticion,
  NOMBRE_COOKIE_DESTINATARIO,
  olvidarDestinatarioDeLaClave,
  recordarDestinatarioDeLaClave,
} = await import("./destinatarioDeLaClave");

/**
 * De quien era la contrasenia que esta peticion ya no puede mostrar (S11 de
 * `usuarios-ux`).
 *
 * La clave temporal viaja en su propia cookie y el proxy la consume en la
 * unica peticion que trae su token, asi que en la recarga ya no queda nada
 * que diga de quien era. Esta cookie es solo el `usuarioId` y el token: con
 * eso la pantalla busca a la persona en el listado que ya leyo bajo RLS y
 * puede ofrecer restablecer su contrasenia. **No lleva la clave**, y no la
 * va a llevar: es lo que esta cookie no puede tener.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const USUARIO = "22222222-2222-4222-8222-222222222222";

const recordar = () =>
  recordarDestinatarioDeLaClave({ token: TOKEN, usuarioId: USUARIO });

beforeEach(() => {
  estado.cookies.clear();
});

describe("destinatarioDeLaClaveDeLaPeticion", () => {
  it("con el token de la clave devuelve de quien era", async () => {
    await recordar();

    expect(await destinatarioDeLaClaveDeLaPeticion(TOKEN)).toEqual({
      token: TOKEN,
      usuarioId: USUARIO,
    });
  });

  it("guarda de quien era y el token, nunca la clave", async () => {
    await recordar();

    const guardada = estado.cookies.get(NOMBRE_COOKIE_DESTINATARIO);

    expect(guardada?.valor).toBe(`${TOKEN}:${USUARIO}`);
    expect(guardada?.opciones.httpOnly).toBe(true);
    expect(guardada?.opciones.path).toBe("/usuarios");
    expect(guardada?.opciones.maxAge).toBe(120);
    expect(guardada?.opciones.sameSite).toBe("lax");
  });

  it("sin token en la URL no dice nada, aunque la cookie siga ahi", async () => {
    await recordar();

    expect(await destinatarioDeLaClaveDeLaPeticion(undefined)).toBeNull();
  });

  it("un token que no es el suyo no dice de quien era", async () => {
    await recordar();

    expect(
      await destinatarioDeLaClaveDeLaPeticion(
        "33333333-3333-4333-8333-333333333333",
      ),
    ).toBeNull();
  });

  it("una cookie que no tiene la forma se ignora entera", async () => {
    estado.cookies.set(NOMBRE_COOKIE_DESTINATARIO, {
      valor: '{"token":"no-es-un-uuid"}',
      opciones: {},
    });

    expect(await destinatarioDeLaClaveDeLaPeticion(TOKEN)).toBeNull();
  });

  it("olvidarla la borra: otra visita no la vuelve a anunciar", async () => {
    await recordar();
    await olvidarDestinatarioDeLaClave();

    expect(estado.cookies.size).toBe(0);
  });
});
