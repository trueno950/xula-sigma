import { describe, expect, it } from "vitest";
import {
  borradorDelFormulario,
  decodificarBorrador,
} from "./borradorDeAltaDeUsuario";

/**
 * S6 de `usuarios-ux`: lo capturado en un alta rechazada viaja en una cookie
 * httpOnly (`borradorEnCookie.ts`). Aca se decide su forma, y la forma tiene
 * un deber: no llevar contrasenia, porque el alta no la captura —la genera el
 * sistema— y un dato que no existe no puede filtrarse.
 */

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

const CAPTURADO = {
  nombre: "  Nueva Operadora  ",
  email: " nueva@motul.example.com ",
  rol: "OPERADOR",
};

describe("borrador del alta de usuario", () => {
  it("captura nombre, correo y rol tal como se escribieron, con su token", () => {
    const borrador = borradorDelFormulario(formulario(CAPTURADO));

    expect(borrador.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(borrador.campos).toEqual(CAPTURADO);
  });

  it("no lleva ninguna contrasenia: la genera el sistema", () => {
    const guardado = JSON.stringify(
      borradorDelFormulario(formulario(CAPTURADO)),
    );

    expect(guardado).not.toContain("clave");
    expect(guardado).not.toContain("contrasenia");
  });

  it("sobrevive el viaje de ida y vuelta por la cookie", () => {
    const borrador = borradorDelFormulario(formulario(CAPTURADO));

    expect(decodificarBorrador(JSON.stringify(borrador))).toEqual(borrador);
  });

  it.each([
    ["sin valor", undefined],
    ["sin ser json", "no-es-json"],
    ["sin token", JSON.stringify({ campos: CAPTURADO })],
    [
      "con un token que no es un uuid",
      JSON.stringify({ token: "inventado", campos: CAPTURADO }),
    ],
    [
      "con un campo que no es texto",
      JSON.stringify({ token: crypto.randomUUID(), campos: { nombre: 3 } }),
    ],
  ])("lo que no tiene la forma se ignora: %s", (_caso, valor) => {
    expect(decodificarBorrador(valor)).toBeNull();
  });
});
