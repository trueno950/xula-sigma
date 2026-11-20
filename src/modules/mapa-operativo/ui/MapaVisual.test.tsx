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

  /**
   * El fallo de CI `e2e/mapa-operativo.spec.ts` («Element is not visible»)
   * nacia aca: el contenedor se pintaba con `visibility: hidden` y solo se
   * destapaba en un commit de React posterior al que Leaflet ya habia
   * plantado sus controles dentro. Entre los dos habia controles de zoom
   * enfocables e invisibles -Playwright los encontraba y no podia hacerles
   * clic-, y el mapa entero se veia tapado hasta ese commit. El contenedor
   * no puede nacer oculto: quien decide si hay mapa es `mapaFallido`.
   */
  it("no nace oculto: los controles que Leaflet crea adentro se ven al instante", () => {
    const html = renderToStaticMarkup(
      <MapaVisual
        marcadores={[marcadorDe([HECHO_DE_REPORTE])]}
        caja={CAJA}
        elegida={null}
        onSeleccion={() => {}}
      />,
    );

    expect(html).not.toMatch(/style="[^"]*visibility/);
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
