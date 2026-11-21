import { beforeEach, describe, expect, it, vi } from "vitest";
import { codificarClaveMostrada } from "../claveMostrada";

/**
 * El boton «Ya la anote» (S9 de `usuarios-ux`): borra la cookie de la
 * contrasenia temporal y deja la pantalla en el listado **sin el token en la
 * URL**, para que recargar no vuelva a mostrar la clave.
 *
 * La cookie es de otro: un token que no coincide con el guardado no la
 * borra, y aun asi la accion devuelve al listado limpio, porque quedarse en
 * una URL con `?clave=` no mostraria nada y confundiria.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const OTRO_TOKEN = "33333333-3333-4333-8333-333333333333";
const USUARIO = "22222222-2222-4222-8222-222222222222";

const cookies = vi.hoisted(() => {
  const guardadas = new Map<string, string>();

  return {
    guardadas,
    almacen: {
      get: (nombre: string) => {
        const valor = guardadas.get(nombre);
        return valor === undefined ? undefined : { name: nombre, value: valor };
      },
      set: (nombre: string, valor: string) => void guardadas.set(nombre, valor),
      delete: ({ name }: { name: string }) => void guardadas.delete(name),
    },
  };
});

const redirectMock = vi.hoisted(() =>
  vi.fn((destino: string): never => {
    throw new Error(`REDIRECT:${destino}`);
  }),
);

vi.mock("next/headers", () => ({ cookies: async () => cookies.almacen }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { descartarClaveMostradaAction } = await import(
  "./descartarClaveMostradaAction"
);
const { NOMBRE_COOKIE_CLAVE_MOSTRADA } = await import(
  "../claveMostradaEnTransito"
);

const formulario = (token: string) => {
  const formData = new FormData();
  formData.set("token", token);

  return formData;
};

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

beforeEach(() => {
  cookies.guardadas.clear();
  redirectMock.mockClear();
});

describe("descartarClaveMostradaAction", () => {
  it("con el token de la cookie, la borra y vuelve al listado sin el token en la URL", async () => {
    guardar();

    await expect(
      descartarClaveMostradaAction(formulario(TOKEN)),
    ).rejects.toThrow("REDIRECT:/usuarios");

    expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(false);
  });

  it("un token que no es el de la cookie no la borra, y la pantalla vuelve al listado igual", async () => {
    guardar();

    await expect(
      descartarClaveMostradaAction(formulario(OTRO_TOKEN)),
    ).rejects.toThrow("REDIRECT:/usuarios");

    expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(true);
  });

  it("un token que no es un uuid no borra nada", async () => {
    guardar();

    await expect(
      descartarClaveMostradaAction(formulario("basura")),
    ).rejects.toThrow("REDIRECT:/usuarios");

    expect(cookies.guardadas.has(NOMBRE_COOKIE_CLAVE_MOSTRADA)).toBe(true);
  });
});
