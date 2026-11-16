import { describe, expect, it } from "vitest";
import { filtrosDeLaConsulta } from "./cargaDeLaBandeja";

const LUGAR = "11111111-1111-4111-8111-111111111111";

/**
 * La traduccion de los filtros de la URL a los de la consulta: el `?lugar=`
 * se cambia por los ids de su subarbol -que resolvio el servidor- y el
 * `?atrasados=1` por la fecha civil de corte. Lo que la bandeja no puede
 * mandar al repositorio es el lugar suelto: un id no filtra nada.
 */
describe("filtrosDeLaConsulta", () => {
  it("sin filtros devuelve un objeto vacio, no llaves en undefined", () => {
    expect(filtrosDeLaConsulta({ filtros: {} })).toEqual({});
  });

  it("conserva estado, tipo y area tal como llegaron", () => {
    expect(
      filtrosDeLaConsulta({
        filtros: { estado: "RECIBIDO", tipo: "BACHE", area: "OBRAS_PUBLICAS" },
      }),
    ).toEqual({
      estado: "RECIBIDO",
      tipo: "BACHE",
      area: "OBRAS_PUBLICAS",
    });
  });

  it("cambia el lugar por los ids de su subarbol", () => {
    const filtros = filtrosDeLaConsulta({
      filtros: { lugar: LUGAR },
      lugarIds: [LUGAR, "22222222-2222-4222-8222-222222222222"],
    });

    expect(filtros).not.toHaveProperty("lugar");
    expect(filtros.lugarIds).toEqual([
      LUGAR,
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("el corte de atrasados viaja ya calculado", () => {
    expect(
      filtrosDeLaConsulta({ filtros: {}, atrasadosDesde: "2026-11-09" }),
    ).toEqual({ atrasadosDesde: "2026-11-09" });
  });
});
