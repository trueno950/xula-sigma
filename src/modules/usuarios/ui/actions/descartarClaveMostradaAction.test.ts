import { describe, expect, it, vi } from "vitest";

const almacen = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => {
      const valor = almacen.get(nombre);
      return valor === undefined ? undefined : { name: nombre, value: valor };
    },
    set: (nombre: string, valor: string) => void almacen.set(nombre, valor),
    delete: ({ name }: { name: string }) => void almacen.delete(name),
  }),
}));

const {
  claveMostradaDeLaPeticion,
  descartarClaveMostrada,
  guardarClaveMostrada,
} = await import("../claveTemporalEnCookie");
const { descartarClaveMostradaAction } = await import(
  "./descartarClaveMostradaAction"
);

/**
 * La clave se muestra una sola vez (S4): la primera pintura consume la
 * cookie, o recargar la misma URL la vuelve a mostrar mientras viva.
 */
const guardar = () =>
  guardarClaveMostrada({
    motivo: "alta",
    usuarioId: "22222222-2222-4222-8222-222222222222",
    clave: "clave-temporal-larga",
  });
describe("descartar la clave mostrada", () => {
  it("borra la cookie cuando el token es el suyo", async () => {
    const mostrada = await guardar();
    await descartarClaveMostrada(mostrada.token);
    expect(await claveMostradaDeLaPeticion(mostrada.token)).toBeNull();
  });

  it("deja la cookie cuando la URL trae otro token", async () => {
    const mostrada = await guardar();
    await descartarClaveMostrada("33333333-3333-4333-8333-333333333333");
    expect(await claveMostradaDeLaPeticion(mostrada.token)).toEqual(mostrada);
  });

  it("la accion no borra nada si el token no es uuid", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    const mostrada = await guardar();
    await descartarClaveMostradaAction("no-es-un-uuid");
    expect(await claveMostradaDeLaPeticion(mostrada.token)).toEqual(mostrada);
    expect(registro).toHaveBeenCalled();
    registro.mockRestore();
  });
});
