import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { colorDeEstado, construirLeyenda } from "../domain";
import { LeyendaDelMapa } from "./LeyendaDelMapa";

/** El texto que ve la operadora: lo mismo que `textContent` en el navegador. */
const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

const LEYENDA = construirLeyenda([
  { recurso: "REPORTE", tipo: "BACHE", estado: "RECIBIDO" },
  { recurso: "REPORTE", tipo: "BACHE", estado: "RESUELTO" },
  { recurso: "INTERVENCION", tipo: "OBRA", estado: "PLANIFICADA" },
]);

/**
 * S3: la leyenda es HTML del servidor y sus colores vienen decididos desde
 * el servidor, no de una paleta del cliente. Con JavaScript apagado no hay
 * nada que hidratar para que se vea.
 */
describe("LeyendaDelMapa", () => {
  it("lista cada tipo con su icono, su etiqueta y su conteo", () => {
    const html = renderToStaticMarkup(<LeyendaDelMapa leyenda={LEYENDA} />);

    expect(html).toContain('aria-label="Conteo por tipo"');
    expect(textoPlano(html)).toContain("Bache (reporte) 2");
    expect(textoPlano(html)).toContain("Obra (intervención) 1");
    expect(html).toContain("<svg");
  });

  it("lista cada estado con el color que decidio el servidor", () => {
    const html = renderToStaticMarkup(<LeyendaDelMapa leyenda={LEYENDA} />);

    expect(html).toContain('aria-label="Conteo por estado"');
    expect(textoPlano(html)).toContain("Recibido 1");
    expect(textoPlano(html)).toContain("Planificada 1");
    expect(html).toContain(colorDeEstado("RECIBIDO"));
  });

  it("no dibuja una leyenda vacia", () => {
    const html = renderToStaticMarkup(
      <LeyendaDelMapa leyenda={{ tipos: [], estados: [], atrasados: 0 }} />,
    );

    expect(html).toBe("");
  });

  it("S1: dice cuantos reportes estan atrasados, y calla cuando no hay", () => {
    const conAtraso = renderToStaticMarkup(
      <LeyendaDelMapa leyenda={{ ...LEYENDA, atrasados: 2 }} />,
    );

    expect(conAtraso).toContain('aria-label="Conteo de atrasados"');
    expect(textoPlano(conAtraso)).toContain(
      "Reportes sin atender más de lo permitido 2",
    );
    expect(
      textoPlano(renderToStaticMarkup(<LeyendaDelMapa leyenda={LEYENDA} />)),
    ).not.toContain("Atrasados");
  });
});
