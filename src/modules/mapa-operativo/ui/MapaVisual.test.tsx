import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapaVisual } from "./MapaVisual";
import { CAJA, HECHO_DE_REPORTE, marcadorDe } from "./mapaDePrueba";

describe("MapaVisual", () => {
  /**
   * Leaflet deja dentro del contenedor los marcadores y los controles de
   * zoom, los dos enfocables. `role="img"` trata todo ese subarbol como una
   * imagen y los esconde al lector de pantalla: axe lo marca como
   * `nested-interactive`, y la lista de `MapaOperativo` no es reemplazo del
   * mapa para quien navega con teclado.
   */
  it("se declara region etiquetada, no imagen, porque sus marcadores son enfocables", () => {
    const html = renderToStaticMarkup(
      <MapaVisual
        marcadores={[marcadorDe([HECHO_DE_REPORTE])]}
        caja={CAJA}
        elegida={null}
        onSeleccion={() => {}}
      />,
    );

    expect(html).toContain("<section");
    expect(html).toContain(
      'aria-label="Mapa con los marcadores del municipio, ubicación aproximada"',
    );
    expect(html).not.toContain('role="img"');
  });

  it("sin calles ubicadas no dibuja el mapa, que no tiene caja que bloquear", () => {
    const html = renderToStaticMarkup(
      <MapaVisual
        marcadores={[]}
        caja={null}
        elegida={null}
        onSeleccion={() => {}}
      />,
    );

    expect(html).toBe("");
  });
});
