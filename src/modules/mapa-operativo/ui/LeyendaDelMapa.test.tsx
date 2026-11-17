import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { colorDeEstado, construirLeyenda } from "../domain";
import { LeyendaDelMapa } from "./LeyendaDelMapa";
import { textoPlano } from "./mapaDePrueba";

const LEYENDA = construirLeyenda([
  { recurso: "REPORTE", tipo: "BACHE", estado: "RECIBIDO" },
  { recurso: "REPORTE", tipo: "BACHE", estado: "RESUELTO" },
  { recurso: "INTERVENCION", tipo: "OBRA", estado: "PLANIFICADA" },
]);

/**
 * S3: la leyenda vive dentro del mapa como una capa compacta y plegable, y es
 * HTML del servidor: sin JavaScript se lee igual. Sus colores vienen
 * decididos desde el servidor, no de una paleta del cliente.
 */
describe("LeyendaDelMapa", () => {
  it("es una capa plegable abierta por defecto, con el total de hechos", () => {
    const html = renderToStaticMarkup(<LeyendaDelMapa leyenda={LEYENDA} />);

    expect(html).toContain("<details");
    expect(html).toContain("open");
    expect(textoPlano(html)).toContain("Leyenda 3 hechos");
  });

  it("lista cada tipo con su icono, su etiqueta y su conteo, sin repetir el recurso", () => {
    const html = renderToStaticMarkup(<LeyendaDelMapa leyenda={LEYENDA} />);
    const texto = textoPlano(html);

    expect(html).toContain('aria-label="Conteo por tipo"');
    expect(texto).toContain("Bache 2");
    expect(texto).toContain("Obra 1");
    expect(texto).not.toContain("(reporte)");
    expect(texto).not.toContain("(intervención)");
    expect(html).toContain("<svg");
  });

  it("lista cada estado con el color que decidio el servidor y su palabra", () => {
    const html = renderToStaticMarkup(<LeyendaDelMapa leyenda={LEYENDA} />);
    const texto = textoPlano(html);

    expect(html).toContain('aria-label="Conteo por estado"');
    expect(texto).toContain("Recibido 1");
    expect(texto).toContain("Planificada 1");
    expect(html).toContain(colorDeEstado("RECIBIDO"));
  });

  it("marca el atraso con el mismo aro rojo del pin, y lo dice con la palabra", () => {
    const html = renderToStaticMarkup(
      <LeyendaDelMapa leyenda={{ ...LEYENDA, atrasados: 2 }} />,
    );

    expect(html).toContain('aria-label="Conteo de atrasados"');
    expect(textoPlano(html)).toContain("Atrasados 2");
    expect(html).toContain("ring-senial-error");
  });

  it("sin atrasados el renglon no aparece", () => {
    const html = renderToStaticMarkup(<LeyendaDelMapa leyenda={LEYENDA} />);

    expect(html).not.toContain('aria-label="Conteo de atrasados"');
    expect(textoPlano(html)).not.toContain("Atrasados");
  });

  it("no dibuja una leyenda vacia", () => {
    const html = renderToStaticMarkup(
      <LeyendaDelMapa
        leyenda={{ tipos: [], estados: [], atrasados: 0, total: 0 }}
      />,
    );

    expect(html).toBe("");
  });
});
