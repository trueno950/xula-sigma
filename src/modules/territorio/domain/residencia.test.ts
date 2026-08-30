import { describe, expect, it } from "vitest";
import { vigenteDe } from "./residencia";

type ResidenciaDePrueba = { id: string; hastaEn: string | null };

describe("vigenteDe", () => {
  it("historial vacio devuelve null", () => {
    expect(vigenteDe<ResidenciaDePrueba>([])).toBeNull();
  });

  it("una sola residencia abierta es la vigente", () => {
    const abierta: ResidenciaDePrueba = { id: "r1", hastaEn: null };

    expect(vigenteDe([abierta])).toBe(abierta);
  });

  it("con dos residencias donde solo una tiene hastaEn null, esa es la vigente", () => {
    const cerrada: ResidenciaDePrueba = { id: "r1", hastaEn: "2020-01-01" };
    const abierta: ResidenciaDePrueba = { id: "r2", hastaEn: null };

    expect(vigenteDe([cerrada, abierta])).toBe(abierta);
  });

  /**
   * `historialDe` ya devuelve en el orden `desdeEn DESC, creadoEn DESC`
   * (design.md seccion 7): reordenar aca seria una segunda copia del
   * criterio. Este caso pasa un arreglo deliberadamente "mal ordenado" -la
   * abierta al final- y confirma que `vigenteDe` toma la **primera** que
   * cumple, sin corregir el orden.
   */
  it("no reordena el historial: toma la primera con hastaEn null en el orden recibido", () => {
    const abiertaAlFinal: ResidenciaDePrueba = {
      id: "r-abierta",
      hastaEn: null,
    };
    const cerradaAlPrincipio: ResidenciaDePrueba = {
      id: "r-cerrada",
      hastaEn: "2021-01-01",
    };

    const resultado = vigenteDe([cerradaAlPrincipio, abiertaAlFinal]);

    expect(resultado).toBe(abiertaAlFinal);
  });
});
