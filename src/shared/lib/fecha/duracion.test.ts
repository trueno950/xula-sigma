import { describe, expect, it } from "vitest";
import { duracionCivil } from "./duracion";

/**
 * S6 de `constancias-ux`: el aviso de la emision dice cuanto tiempo lleva la
 * persona en su domicilio. Se mide en palabras y no en dias porque lo que la
 * operadora comprueba es si la fecha que tiene enfrente es razonable, no un
 * numero que haya que dividir entre 30.
 */
describe("duracionCivil", () => {
  it("el mismo dia es «hoy»", () => {
    expect(duracionCivil("2026-11-18", "2026-11-18")).toBe("hoy");
  });

  it("un dia va en singular", () => {
    expect(duracionCivil("2026-11-17", "2026-11-18")).toBe("1 día");
  });

  it("unos dias van en plural", () => {
    expect(duracionCivil("2026-11-01", "2026-11-05")).toBe("4 días");
  });

  it("los meses se combinan con los dias, como en el ejemplo de S6", () => {
    expect(duracionCivil("2026-10-01", "2026-11-18")).toBe("1 mes y 17 días");
  });

  it("mas de un mes va en plural", () => {
    expect(duracionCivil("2026-09-01", "2026-11-01")).toBe("2 meses");
  });

  it("los anios encabezan y el resto se agrega con comas y «y»", () => {
    expect(duracionCivil("2024-01-01", "2026-11-18")).toBe(
      "2 años, 10 meses y 17 días",
    );
  });

  it("un anio exacto va en singular", () => {
    expect(duracionCivil("2025-11-18", "2026-11-18")).toBe("1 año");
  });

  it("un anio y un dia suman las dos partes", () => {
    expect(duracionCivil("2025-11-18", "2026-11-19")).toBe("1 año y 1 día");
  });

  /**
   * El 31 de enero mas un mes no existe: el prestatario es febrero. Sin el
   * recorte al ultimo dia del mes, el 31 caeria en marzo y la cuenta diria
   * dos meses donde hay uno.
   */
  it("recorta el dia al ultimo del mes al prestar meses", () => {
    expect(duracionCivil("2026-01-31", "2026-03-01")).toBe("1 mes y 1 día");
  });

  /** Una residencia que empieza manana es un dato invalido, no «hoy». */
  it("una fecha de inicio posterior devuelve null", () => {
    expect(duracionCivil("2026-11-19", "2026-11-18")).toBeNull();
  });

  it("una fecha civil invalida devuelve null", () => {
    expect(duracionCivil("2026-02-30", "2026-11-18")).toBeNull();
    expect(duracionCivil("18/11/2026", "2026-11-18")).toBeNull();
  });

  /**
   * El anio bisiesto es el unico caso en que febrero tiene 29 dias: si el
   * recorte usara 30 para todos los meses, el 29 de febrero caeria en marzo.
   */
  it("febrero bisiesto conserva el 29", () => {
    expect(duracionCivil("2024-02-29", "2025-02-28")).toBe("1 año");
  });
});
