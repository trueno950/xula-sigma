import { beforeEach, describe, expect, it, vi } from "vitest";
import { codificarClaveMostrada } from "@/modules/usuarios/ui/claveMostrada";
import { NOMBRE_COOKIE_CLAVE_MOSTRADA } from "@/modules/usuarios/ui/claveMostradaEnTransito";

/**
 * `POST /usuarios/clave-temporal`: borra la cookie de la contrasenia
 * temporal sin redibujar la ruta. Por que es un Route Handler y no una
 * Server Action: `AGENTS.md`, seccion Server Actions, nota de `usuarios`
 * (S9 de `usuarios-ux`).
 *
 * Lo que se prueba aca es el borde: el token guarda la cookie de quien manda
 * la peticion, un cuerpo con forma equivocada no borra nada y una peticion
 * sin cookie no llega a borrar.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const OTRO_TOKEN = "33333333-3333-4333-8333-333333333333";
const USUARIO = "22222222-2222-4222-8222-222222222222";

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
      clave: "clave-temporal-larga",
    }),
  );

const peticion = (cuerpo: string) =>
  new Request("http://motul.example.com/usuarios/clave-temporal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: cuerpo,
  });

beforeEach(() => {
  cookies.guardadas.clear();
  cookies.borrar.mockClear();
  guardar();
});

describe("POST /usuarios/clave-temporal", () => {
  it("con el token de la cookie, la borra una sola vez", async () => {
    const respuesta = await POST(peticion(JSON.stringify({ token: TOKEN })));

    expect(respuesta.status).toBe(204);
    expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(false);
    expect(cookies.borrar).toHaveBeenCalledTimes(1);
  });

  it("un token que no es el de la cookie no la borra", async () => {
    const respuesta = await POST(
      peticion(JSON.stringify({ token: OTRO_TOKEN })),
    );

    expect(respuesta.status).toBe(204);
    expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(true);
    expect(cookies.borrar).not.toHaveBeenCalled();
  });

  it("sin cookie no hay nada que borrar, y responde igual", async () => {
    cookies.guardadas.clear();

    const respuesta = await POST(peticion(JSON.stringify({ token: TOKEN })));

    expect(respuesta.status).toBe(204);
    expect(cookies.borrar).not.toHaveBeenCalled();
  });

  for (const cuerpo of ["[]", '{"token":123}', `"${TOKEN}"`, "{}", ""]) {
    it(`un cuerpo ${JSON.stringify(cuerpo)} no borra nada`, async () => {
      const respuesta = await POST(peticion(cuerpo));

      expect(respuesta.status).toBe(400);
      expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(true);
      expect(cookies.borrar).not.toHaveBeenCalled();
    });
  }
});
