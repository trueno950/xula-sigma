import { beforeEach, describe, expect, it, vi } from "vitest";
import { codificarClaveMostrada } from "@/modules/usuarios/ui/claveMostrada";
import { NOMBRE_COOKIE_CLAVE_MOSTRADA } from "@/modules/usuarios/ui/claveMostradaEnTransito";

/**
 * `POST /usuarios/clave-temporal`: entrega la contrasenia temporal **una sola
 * vez** y borra la cookie en la misma respuesta, sin redibujar la ruta (S4 de
 * `usuarios-seguridad`). Por que es un Route Handler y no una Server Action:
 * `AGENTS.md`, seccion Server Actions, nota de `usuarios`.
 *
 * Lo que se prueba aca es el borde: el token acota la entrega a la cookie de
 * quien manda la peticion, la segunda peticion ya no encuentra nada, un cuerpo
 * con forma equivocada no entrega ni borra, y ninguna respuesta se guarda en
 * cache.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const OTRO_TOKEN = "33333333-3333-4333-8333-333333333333";
const USUARIO = "22222222-2222-4222-8222-222222222222";
const CLAVE = "clave-temporal-larga";

const cookies = vi.hoisted(() => {
  const guardadas = new Map<string, string>();
  const borrar = vi.fn(({ name }: { name: string }) => {
    guardadas.delete(name);
  });

  return {
    guardadas,
    borrar,
    almacen: {
      get: (nombre: string) => {
        const valor = guardadas.get(nombre);
        return valor === undefined ? undefined : { name: nombre, value: valor };
      },
      set: (nombre: string, valor: string) => void guardadas.set(nombre, valor),
      delete: borrar,
    },
  };
});

vi.mock("next/headers", () => ({ cookies: async () => cookies.almacen }));

const { POST } = await import("./route");

const guardar = () =>
  cookies.guardadas.set(
    NOMBRE_COOKIE_CLAVE_MOSTRADA,
    codificarClaveMostrada({
      token: TOKEN,
      motivo: "alta",
      usuarioId: USUARIO,
      clave: CLAVE,
    }),
  );

const peticion = (cuerpo: string) =>
  new Request("http://motul.example.com/usuarios/clave-temporal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: cuerpo,
  });

const conElToken = () => peticion(JSON.stringify({ token: TOKEN }));

beforeEach(() => {
  cookies.guardadas.clear();
  cookies.borrar.mockClear();
  guardar();
});

describe("POST /usuarios/clave-temporal", () => {
  it("con el token de la cookie, entrega la clave y la borra en la misma respuesta", async () => {
    const respuesta = await POST(conElToken());

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ clave: CLAVE, motivo: "alta" });
    expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(false);
    expect(cookies.borrar).toHaveBeenCalledTimes(1);
  });

  it("la segunda peticion ya no encuentra nada que entregar", async () => {
    await POST(conElToken());

    const segunda = await POST(conElToken());

    expect(segunda.status).toBe(404);
    expect(await segunda.text()).toBe("");
  });

  it("un token que no es el de la cookie no entrega nada ni la borra", async () => {
    const respuesta = await POST(
      peticion(JSON.stringify({ token: OTRO_TOKEN })),
    );

    expect(respuesta.status).toBe(404);
    expect(await respuesta.text()).not.toContain(CLAVE);
    expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(true);
    expect(cookies.borrar).not.toHaveBeenCalled();
  });

  it("sin cookie no hay nada que entregar", async () => {
    cookies.guardadas.clear();

    const respuesta = await POST(conElToken());

    expect(respuesta.status).toBe(404);
    expect(cookies.borrar).not.toHaveBeenCalled();
  });

  /** La clave no se queda en ninguna cache intermedia. */
  it("ninguna respuesta se guarda en cache", async () => {
    const entregada = await POST(conElToken());
    const yaNo = await POST(conElToken());
    const malArmada = await POST(peticion(""));

    for (const respuesta of [entregada, yaNo, malArmada]) {
      expect(respuesta.headers.get("cache-control")).toBe("no-store");
    }
  });

  for (const cuerpo of ["[]", '{"token":123}', `"${TOKEN}"`, "{}", ""]) {
    it(`un cuerpo ${JSON.stringify(cuerpo)} no entrega nada y deja la cookie`, async () => {
      const respuesta = await POST(peticion(cuerpo));

      expect(respuesta.status).toBe(400);
      expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(true);
      expect(cookies.borrar).not.toHaveBeenCalled();
    });
  }
});
