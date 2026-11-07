import { describe, expect, it } from "vitest";
import { tiposParaElAlta, tituloDelAlta, verboDelAlta } from "./tiposDelAlta";

describe("tiposParaElAlta", () => {
  it("sin padre ni cabecera ofrece los dos rangos superiores", () => {
    expect(tiposParaElAlta({ hayCabecera: false })).toEqual([
      "cabecera",
      "comisaria",
    ]);
  });

  it("sin padre y con cabecera ya no ofrece cabecera", () => {
    expect(tiposParaElAlta({ hayCabecera: true })).toEqual(["comisaria"]);
  });

  it("con padre ofrece lo que ese padre contiene, haya cabecera o no", () => {
    expect(
      tiposParaElAlta({ tipoDelPadre: "comisaria", hayCabecera: true }),
    ).toEqual(
      tiposParaElAlta({ tipoDelPadre: "comisaria", hayCabecera: false }),
    );
  });
});

describe("los textos del alta cuando cabe un solo tipo", () => {
  it("dentro de un asentamiento nombra el tipo y el padre", () => {
    const tipos = tiposParaElAlta({
      tipoDelPadre: "comisaria",
      hayCabecera: true,
    });

    expect(tituloDelAlta({ tipos, dentroDe: "Kiní" })).toBe(
      "Nueva colonia en Kiní",
    );
    expect(verboDelAlta(tipos)).toBe("Agregar colonia");
  });

  it("en la raiz con cabecera ya creada nombra la comisaria", () => {
    const tipos = tiposParaElAlta({ hayCabecera: true });

    expect(tituloDelAlta({ tipos })).toBe("Nueva comisaría");
    expect(verboDelAlta(tipos)).toBe("Agregar comisaría");
  });

  it("con mas de un tipo conserva los textos genericos", () => {
    const tipos = tiposParaElAlta({ hayCabecera: false });

    expect(tituloDelAlta({ tipos })).toBe("Agregar asentamiento");
    expect(tituloDelAlta({ tipos, dentroDe: "Motul" })).toBe(
      "Agregar un lugar dentro de Motul",
    );
    expect(verboDelAlta(tipos)).toBeUndefined();
  });
});
