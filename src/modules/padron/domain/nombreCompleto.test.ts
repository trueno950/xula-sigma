import { describe, expect, it } from "vitest";
import { nombreCompletoDe } from "./nombreCompleto";

describe("nombreCompletoDe", () => {
  it("une nombres y los dos apellidos con un espacio, en ese orden", () => {
    expect(
      nombreCompletoDe({
        nombres: "Maria Jose",
        primerApellido: "Canche",
        segundoApellido: "Pech",
      }),
    ).toBe("Maria Jose Canche Pech");
  });

  it("sin segundo apellido no deja espacio al final", () => {
    expect(
      nombreCompletoDe({
        nombres: "Juan",
        primerApellido: "May",
        segundoApellido: null,
      }),
    ).toBe("Juan May");
  });

  it("un segundo apellido vacio se omite igual que uno ausente", () => {
    expect(
      nombreCompletoDe({
        nombres: "Juan",
        primerApellido: "May",
        segundoApellido: "",
      }),
    ).toBe("Juan May");
  });

  it("no recorta los espacios de cada parte", () => {
    expect(
      nombreCompletoDe({
        nombres: " Juan ",
        primerApellido: "May",
        segundoApellido: null,
      }),
    ).toBe(" Juan  May");
  });
});
