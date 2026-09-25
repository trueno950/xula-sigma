import { describe, expect, it } from "vitest";
import { tiposParaElAlta } from "./tiposDelAlta";

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
