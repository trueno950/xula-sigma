import { describe, expect, it } from "vitest";
import { LARGO_MINIMO } from "@/shared/auth/reglasDeClave";
import { esquemaDeAcceso } from "./esquemaDeAcceso";

const mensajesDe = (entrada: unknown) => {
  const resultado = esquemaDeAcceso.safeParse(entrada);

  return resultado.success ? [] : resultado.error.issues.map((i) => i.message);
};

describe("esquemaDeAcceso", () => {
  it("acepta un correo valido y una clave del largo minimo", () => {
    expect(
      esquemaDeAcceso.safeParse({
        email: "tesoreria@example.com",
        password: "x".repeat(LARGO_MINIMO),
      }).success,
    ).toBe(true);
  });

  it("dice que la contraseña es demasiado corta cuando no llega al minimo", () => {
    expect(
      mensajesDe({
        email: "tesoreria@example.com",
        password: "x".repeat(LARGO_MINIMO - 1),
      }),
    ).toEqual(["La contraseña es demasiado corta."]);
  });

  it("pide revisar el correo cuando no es un correo", () => {
    expect(
      mensajesDe({
        email: "no-es-correo",
        password: "x".repeat(LARGO_MINIMO),
      }),
    ).toEqual(["Revise el correo."]);
  });
});
