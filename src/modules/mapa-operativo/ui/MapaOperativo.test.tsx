import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapaOperativo } from "./MapaOperativo";

describe("MapaOperativo", () => {
  it("distingue hechos y declara que la ubicacion de calle es aproximada", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        mapa={{
          estado: "CON_DATOS",
          marcadores: [
            {
              id: "reporte-1",
              recurso: "REPORTE",
              etiqueta: "REP-1",
              href: "/reportes/detalle/reporte-1",
              punto: { latitud: 20.9, longitud: -89.6 },
            },
            {
              id: "intervencion-1",
              recurso: "INTERVENCION",
              etiqueta: "OBRA",
              href: "/intervenciones/intervencion-1",
              punto: { latitud: 20.9, longitud: -89.6 },
            },
          ],
          cobertura: [],
          conteos: { reportes: 1, intervenciones: 1, total: 2 },
        }}
      />,
    );

    expect(html).toContain("Ubicacion aproximada de la calle");
    expect(html).toContain("Reporte ciudadano");
    expect(html).toContain("Intervencion municipal");
    expect(html).toContain('href="/reportes/detalle/reporte-1"');
    expect(html).toContain('href="/intervenciones/intervencion-1"');
  });

  it("muestra un vacio explicito cuando el filtro no deja hechos", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        mapa={{
          estado: "VACIO",
          marcadores: [],
          cobertura: [],
          conteos: { reportes: 0, intervenciones: 0, total: 0 },
        }}
      />,
    );

    expect(html).toContain("No hay hechos para los filtros seleccionados.");
    expect(html).toContain("0 reportes");
    expect(html).toContain("0 intervenciones");
  });
});
