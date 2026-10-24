import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoIdDeReporteEnMapa } from "../domain";
import { MapaVisual } from "./MapaVisual";

const MARCADOR = {
  id: comoIdDeReporteEnMapa("reporte-1"),
  recurso: "REPORTE",
  etiqueta: "REP-1",
  href: "/reportes/detalle/reporte-1",
  punto: { latitud: 20.9, longitud: -89.6 },
} as const;

describe("MapaVisual", () => {
  /**
   * Leaflet deja dentro del contenedor los marcadores y los controles de
   * zoom, los dos enfocables. `role="img"` trata todo ese subarbol como una
   * imagen y los esconde al lector de pantalla: axe lo marca como
   * `nested-interactive`, y la lista de `MapaOperativo` no es reemplazo del
   * mapa para quien navega con teclado.
   */
  it("se declara region etiquetada, no imagen, porque sus marcadores son enfocables", () => {
    const html = renderToStaticMarkup(<MapaVisual marcadores={[MARCADOR]} />);

    expect(html).toContain("<section");
    expect(html).toContain(
      'aria-label="Mapa con los marcadores del municipio, ubicación aproximada"',
    );
    expect(html).not.toContain('role="img"');
  });
});
