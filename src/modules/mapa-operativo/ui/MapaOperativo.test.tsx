import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoIdDeIntervencionEnMapa, comoIdDeReporteEnMapa } from "../domain";
import { MapaOperativo } from "./MapaOperativo";

describe("MapaOperativo", () => {
  it("distingue hechos y declara que la ubicacion de calle es aproximada", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
        mapa={{
          estado: "CON_DATOS",
          marcadores: [
            {
              id: comoIdDeReporteEnMapa("reporte-1"),
              recurso: "REPORTE",
              etiqueta: "REP-1",
              href: "/reportes/detalle/reporte-1",
              punto: { latitud: 20.9, longitud: -89.6 },
            },
            {
              id: comoIdDeIntervencionEnMapa("intervencion-1"),
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
    expect(html).toMatch(/1 reporte(?!s)/);
    expect(html).toMatch(/1 intervencion(?!es)/);
    expect(html).toContain("Reporte ciudadano");
    expect(html).toContain("Intervencion municipal");
    expect(html).toContain('href="/reportes/detalle/reporte-1"');
    expect(html).toContain('href="/intervenciones/intervencion-1"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="tipo"');
    expect(html).toContain('name="estado"');
    expect(html).toContain('name="area"');
  });

  it("declara la calle en la cobertura faltante por calle sin punto", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
        mapa={{
          estado: "CON_DATOS",
          marcadores: [],
          cobertura: [
            {
              id: comoIdDeIntervencionEnMapa("intervencion-2"),
              recurso: "INTERVENCION",
              etiqueta: "OBRA",
              href: "/intervenciones/intervencion-2",
              razon: "CALLE_SIN_PUNTO",
              calle: "Calle 60",
            },
          ],
          conteos: { reportes: 0, intervenciones: 1, total: 1 },
        }}
      />,
    );

    expect(html).toContain("calle sin punto: Calle 60");
  });

  it("muestra un vacio explicito cuando el filtro no deja hechos", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
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
