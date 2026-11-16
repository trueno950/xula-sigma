import { describe, expect, it } from "vitest";
import { leerParametros } from "./parametros";

describe("leerParametros", () => {
  /**
   * El caso que reporto GGA: FiltrosDeReportes manda q/estado/tipo en un
   * solo form. Buscador vacio -> q="" en el GET. Con un `.safeParse()` de
   * todo el objeto, esa "" invalidaba tambien `estado`.
   */
  it("una q vacia no descarta el filtro de estado", () => {
    const parametros = leerParametros({ q: "", estado: "RECIBIDO" });

    expect(parametros.filtros.estado).toBe("RECIBIDO");
    expect(parametros.q).toBeUndefined();
  });

  it("un estado vacio (opcion Todos) no descarta la busqueda de texto", () => {
    const parametros = leerParametros({ estado: "", q: "bache" });

    expect(parametros.filtros.estado).toBeUndefined();
    expect(parametros.q).toBe("bache");
  });

  it("un tipo vacio no descarta estado ni q", () => {
    const parametros = leerParametros({
      tipo: "",
      estado: "RECIBIDO",
      q: "bache",
    });

    expect(parametros.filtros.tipo).toBeUndefined();
    expect(parametros.filtros.estado).toBe("RECIBIDO");
    expect(parametros.q).toBe("bache");
  });

  it("estado=a&estado=b (string[]) cae a undefined sin romper q", () => {
    const parametros = leerParametros({ estado: ["a", "b"], q: "bache" });

    expect(parametros.filtros.estado).toBeUndefined();
    expect(parametros.q).toBe("bache");
  });

  it("ordenar valido arma el orden con direccion por defecto asc", () => {
    const parametros = leerParametros({ ordenar: "folio" });

    expect(parametros.orden).toEqual({ campo: "folio", direccion: "asc" });
  });

  it("sin ordenar no hay orden, aunque venga direccion", () => {
    const parametros = leerParametros({ direccion: "desc" });

    expect(parametros.orden).toBeUndefined();
  });

  it("sin parametros, todo cae a sus defaults", () => {
    const parametros = leerParametros({});

    expect(parametros).toEqual({
      filtros: {},
      q: undefined,
      limite: undefined,
      orden: undefined,
      error: undefined,
      soloAtrasados: false,
    });
  });

  it("atrasados=1 enciende el filtro y cualquier otra cosa lo apaga", () => {
    expect(leerParametros({ atrasados: "1" }).soloAtrasados).toBe(true);
    expect(leerParametros({ atrasados: "0" }).soloAtrasados).toBe(false);
    expect(leerParametros({ atrasados: "" }).soloAtrasados).toBe(false);
    expect(leerParametros({ atrasados: ["1", "1"] }).soloAtrasados).toBe(false);
  });

  it("un area del catalogo se conserva y una inventada se descarta sola", () => {
    expect(leerParametros({ area: "OBRAS_PUBLICAS" }).filtros.area).toBe(
      "OBRAS_PUBLICAS",
    );
    expect(leerParametros({ area: "TESORERIA" }).filtros.area).toBeUndefined();
    expect(leerParametros({ area: "" }).filtros.area).toBeUndefined();
  });

  it("un lugar con forma de uuid se conserva; uno mal formado o repetido se descarta", () => {
    const lugar = "11111111-1111-4111-8111-111111111111";

    expect(leerParametros({ lugar }).filtros.lugar).toBe(lugar);
    expect(leerParametros({ lugar: "kinchil" }).filtros.lugar).toBeUndefined();
    expect(
      leerParametros({ lugar: [lugar, lugar] }).filtros.lugar,
    ).toBeUndefined();
  });

  it("atrasados convive con los otros filtros y no los descarta", () => {
    const parametros = leerParametros({
      atrasados: "1",
      estado: "RECIBIDO",
      q: "bache",
    });

    expect(parametros.soloAtrasados).toBe(true);
    expect(parametros.filtros.estado).toBe("RECIBIDO");
    expect(parametros.q).toBe("bache");
  });

  it("lugar y area viajan en los filtros sin pisar estado ni tipo", () => {
    const lugar = "11111111-1111-4111-8111-111111111111";
    const parametros = leerParametros({
      lugar,
      area: "ALUMBRADO_PUBLICO",
      estado: "RECIBIDO",
      tipo: "BACHE",
    });

    expect(parametros.filtros).toEqual({
      lugar,
      area: "ALUMBRADO_PUBLICO",
      estado: "RECIBIDO",
      tipo: "BACHE",
    });
  });
});
