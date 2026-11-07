import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const { borradorDeAlta, borradorDeCorreccion } = await import(
  "./borradorEnCookie"
);

const DOMICILIO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const formulario = (valores: Record<string, string>) => {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(valores)) datos.set(clave, valor);
  return datos;
};

/**
 * S4 de `territorio-pendientes`: ni el formulario ni la accion limitan el
 * largo del numero o de la referencia, asi que el techo de la cookie puede
 * cortar un valor que el servidor si acepta. El borrador tiene que saberlo.
 */
describe("borrador en cookie: marca cuando recorta lo capturado", () => {
  it("una referencia mas larga que el techo deja el borrador recortado", () => {
    const borrador = borradorDeAlta(
      formulario({ numero: "4", referencia: "a".repeat(301) }),
    );

    expect(borrador.recortado).toBe(true);
    expect(borrador.campos.referencia).toHaveLength(300);
  });

  it("un numero largo en la correccion tambien lo marca", () => {
    const borrador = borradorDeCorreccion(
      formulario({ numero: "9".repeat(41) }),
      DOMICILIO,
    );

    expect(borrador.recortado).toBe(true);
  });

  it("lo que cabe entero no se marca", () => {
    const borrador = borradorDeAlta(
      formulario({ numero: "9".repeat(40), referencia: "a".repeat(300) }),
    );

    expect(borrador.recortado).toBeFalsy();
  });
});
