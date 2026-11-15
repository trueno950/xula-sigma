import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  cabeceras: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => {
      const valor = estado.cookies.get(nombre);
      return valor === undefined ? undefined : { name: nombre, value: valor };
    },
    set: (nombre: string, valor: string) =>
      void estado.cookies.set(nombre, valor),
  }),
  headers: async () => ({
    get: (nombre: string) => estado.cabeceras.get(nombre) ?? null,
  }),
}));

const { claveMostradaDeLaPeticion, guardarClaveMostrada } = await import(
  "./claveTemporalEnCookie"
);
const { CABECERA_CLAVE_MOSTRADA } = await import("./claveMostradaEnTransito");

/**
 * Lo que la pantalla muestra (S2 y S4): la clave llega por la cabecera que
 * dejo el proxy en la peticion que traia el token, y no por la cookie.
 *
 * La cookie sola no alcanza. Esa es la regla: recargar `/usuarios` —sin
 * `?clave=`— deja la cookie viva hasta que vence, y la pantalla no la lee.
 */

const guardar = () =>
  guardarClaveMostrada({
    motivo: "alta",
    usuarioId: "22222222-2222-4222-8222-222222222222",
    clave: "clave-temporal-larga",
  });

beforeEach(() => {
  estado.cookies.clear();
  estado.cabeceras.clear();
});

describe("claveMostradaDeLaPeticion", () => {
  it("lee la clave que el proxy traslado a la cabecera", async () => {
    const mostrada = await guardar();
    estado.cabeceras.set(
      CABECERA_CLAVE_MOSTRADA,
      estado.cookies.get("clave-temporal-de-usuario") ?? "",
    );

    expect(await claveMostradaDeLaPeticion(mostrada.token)).toEqual(mostrada);
  });

  it("sin la cabecera no muestra nada, aunque la cookie siga ahi", async () => {
    const mostrada = await guardar();

    expect(estado.cookies.size).toBe(1);
    expect(await claveMostradaDeLaPeticion(mostrada.token)).toBeNull();
  });

  it("un token de la URL que no es el de la clave no la muestra", async () => {
    await guardar();
    estado.cabeceras.set(
      CABECERA_CLAVE_MOSTRADA,
      estado.cookies.get("clave-temporal-de-usuario") ?? "",
    );

    expect(
      await claveMostradaDeLaPeticion("33333333-3333-4333-8333-333333333333"),
    ).toBeNull();
  });

  it("sin token en la URL no hay nada que mostrar", async () => {
    await guardar();
    estado.cabeceras.set(
      CABECERA_CLAVE_MOSTRADA,
      estado.cookies.get("clave-temporal-de-usuario") ?? "",
    );

    expect(await claveMostradaDeLaPeticion(undefined)).toBeNull();
  });
});
