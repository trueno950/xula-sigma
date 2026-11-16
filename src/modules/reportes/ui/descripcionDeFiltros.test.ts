import { describe, expect, it } from "vitest";
import { descripcionDeFiltrosDeReportes } from "./descripcionDeFiltros";

describe("descripcionDeFiltrosDeReportes", () => {
  it("sin filtros ni busqueda no describe nada", () => {
    expect(descripcionDeFiltrosDeReportes({}, undefined)).toBeUndefined();
  });

  it("nombra estado y busqueda con la etiqueta legible", () => {
    expect(
      descripcionDeFiltrosDeReportes({ estado: "EN_ATENCION" }, "luz"),
    ).toBe('Estado "En atención", búsqueda "luz"');
  });

  it("nombra todos los filtros aplicados", () => {
    expect(
      descripcionDeFiltrosDeReportes(
        { estado: "RESUELTO", tipo: "ALUMBRADO" },
        "luz",
      ),
    ).toBe('Estado "Resuelto", tipo "Alumbrado", búsqueda "luz"');
  });
});

describe("descripcionDeFiltrosDeReportes, filtro de atrasados", () => {
  it("nombra el filtro de atrasados junto a los demas", () => {
    expect(
      descripcionDeFiltrosDeReportes({ estado: "RECIBIDO" }, undefined, {
        soloAtrasados: true,
      }),
    ).toBe('Estado "Recibido", solo atrasados');
  });

  it("sin el filtro no agrega nada", () => {
    expect(
      descripcionDeFiltrosDeReportes({}, undefined, { soloAtrasados: false }),
    ).toBeUndefined();
  });
});

describe("descripcionDeFiltrosDeReportes, lugar y area", () => {
  const LUGAR = "11111111-1111-4111-8111-111111111111";

  it("nombra el area con su etiqueta legible", () => {
    expect(
      descripcionDeFiltrosDeReportes({ area: "OBRAS_PUBLICAS" }, undefined),
    ).toBe('área "Obras públicas"');
  });

  it("nombra el lugar con el nombre que la pantalla ya resolvio", () => {
    expect(
      descripcionDeFiltrosDeReportes({ lugar: LUGAR }, undefined, {
        lugares: [{ id: LUGAR, nombre: "Comisaría de Kinchil" }],
      }),
    ).toBe('lugar "Comisaría de Kinchil"');
  });

  it("un lugar sin nombre resuelto no inventa una etiqueta", () => {
    expect(
      descripcionDeFiltrosDeReportes({ lugar: LUGAR }, undefined, {
        lugares: [],
      }),
    ).toBeUndefined();
  });

  it("nombra todo lo aplicado, en el orden de la pantalla", () => {
    expect(
      descripcionDeFiltrosDeReportes(
        { estado: "RECIBIDO", area: "OBRAS_PUBLICAS", lugar: LUGAR },
        "bache",
        {
          soloAtrasados: true,
          lugares: [{ id: LUGAR, nombre: "Kinchil" }],
        },
      ),
    ).toBe(
      'Estado "Recibido", área "Obras públicas", lugar "Kinchil", solo atrasados, búsqueda "bache"',
    );
  });
});
