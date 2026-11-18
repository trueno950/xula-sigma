import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FiltrosDeReportes } from "./FiltrosDeReportes";

const LUGAR = "22222222-2222-4222-8222-222222222222";

const LUGARES = [
  { valor: LUGAR, etiqueta: "Comisaría de Kinchil (comisaría)" },
] as const;

const html = () =>
  renderToStaticMarkup(
    <FiltrosDeReportes
      lugares={LUGARES}
      porArea={[
        { area: "OBRAS_PUBLICAS", conteo: 2 },
        { area: null, conteo: 1 },
      ]}
    />,
  );

describe("FiltrosDeReportes", () => {
  it("cada opción de área lleva su conteo, con ceros incluidos", () => {
    const pagina = html();

    expect(pagina).toContain(
      '<option value="OBRAS_PUBLICAS">Obras públicas (2)',
    );
    expect(pagina).toContain(
      '<option value="PARQUES_Y_JARDINES">Parques y jardines (0)',
    );
  });

  it("el estado y «solo atrasados» ya no viven en la barra de filtros", () => {
    const pagina = html();

    expect(pagina).not.toContain('name="estado"');
    expect(pagina).not.toContain('name="atrasados"');
  });

  it("sigue siendo un GET nativo con su botón «Filtrar»", () => {
    const pagina = html();

    expect(pagina).toContain("<form ");
    expect(pagina).toContain('method="get"');
    expect(pagina).toContain(">Filtrar<");
    expect(pagina).toContain('name="q"');
  });

  it("la búsqueda dice qué encuentra y el lugar ofrece el municipio", () => {
    const pagina = html();

    expect(pagina).toContain("Buscar reporte");
    expect(pagina).toContain("Folio o descripción");
    expect(pagina).toContain(`<option value="${LUGAR}">`);
  });
});
