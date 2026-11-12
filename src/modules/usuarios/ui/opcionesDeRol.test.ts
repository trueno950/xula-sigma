import { describe, expect, it } from "vitest";
import { opcionesDeRol } from "./opcionesDeRol";

/**
 * S3 en la pantalla: el alta **ofrece** solo operador y consulta. La otra
 * mitad —que el servidor rechace un rol enviado a mano— la cubre
 * `altaDeUsuarioAction.test.ts`.
 */

describe("opcionesDeRol", () => {
  it("ofrece exactamente operador y consulta", () => {
    expect(opcionesDeRol.map((opcion) => opcion.valor)).toEqual([
      "OPERADOR",
      "CONSULTA",
    ]);
  });

  it("las escribe en español, como el resto del panel", () => {
    expect(opcionesDeRol.map((opcion) => opcion.etiqueta)).toEqual([
      "Operador",
      "Consulta",
    ]);
  });

  it("no ofrece el rol que administra el municipio", () => {
    expect(opcionesDeRol.map((opcion) => opcion.valor)).not.toContain(
      "ADMIN_MUNICIPAL",
    );
  });
});
